/**
 * DentAdmin — Formula Engine
 * Moslashuvchan vrach ish haqi formulasi hisoblash
 */

const FormulaEngine = {
  /**
   * Formulani hisoblaydi
   */
  evaluate(formula, vars) {
    try {
      let expr = formula;
      const sortedKeys = Object.keys(vars).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        const val = Number(vars[key]) || 0;
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), val.toString());
      }
      if (!/^[\d\s\+\-\*\/\(\)\.\,]+$/.test(expr)) {
        console.warn('Xavfli formula iborasi:', expr);
        return 0;
      }
      const result = Function('"use strict"; return (' + expr + ')')();
      return isFinite(result) ? Math.round(result) : 0;
    } catch (e) {
      console.error('Formula xatosi:', e);
      return 0;
    }
  },

  /**
   * Vrach ulushini hisoblash (kunlik)
   */
  calcVU(doctor, dayData) {
    const { tushum = 0, texnik = 0, implantCount = 0, implantSum = 0, avans = 0 } = dayData;
    const vars = {
      tushum,
      texnik,
      implant_count: implantCount,
      implant_sum: implantSum,
      implant_value: doctor.implantValue || 0,
      percent: doctor.percent || 0,
      avans
    };
    const vu = this.evaluate(doctor.formula, vars);
    return Math.max(0, vu);
  },

  /**
   * Oylik vrach hisob-kitobi
   */
  calcMonthlyDoctor(doctor, monthDays) {
    let totalTushum = 0, totalTexnik = 0, totalImplantCount = 0, totalImplantSum = 0;
    let totalVU = 0, totalAvans = 0;

    for (const day of monthDays) {
      const entry = (day.doctors || {})[doctor.id] || {};
      totalTushum += Number(entry.tushum) || 0;
      totalTexnik += Number(entry.texnik) || 0;
      totalImplantCount += Number(entry.implantCount) || 0;
      totalImplantSum += Number(entry.implantSum) || 0;
      totalAvans += Number(entry.avans) || 0;

      const vu = this.calcVU(doctor, {
        tushum: entry.tushum || 0,
        texnik: entry.texnik || 0,
        implantCount: entry.implantCount || 0,
        implantSum: entry.implantSum || 0,
        avans: 0
      });
      totalVU += vu;
    }

    const berilishiKerak = totalVU - totalAvans;

    return {
      totalTushum,
      totalTexnik,
      totalImplantCount,
      totalImplantSum,
      totalVU,
      totalAvans,
      berilishiKerak
    };
  },

  /**
   * Formulani tekshirish va preview
   */
  testFormula(formula, sampleVars) {
    const defaults = {
      tushum: 1000000,
      texnik: 200000,
      implant_count: 2,
      implant_sum: 600000,
      implant_value: 300000,
      percent: 35,
      avans: 100000,
      ...sampleVars
    };
    try {
      const result = this.evaluate(formula, defaults);
      return { ok: true, result, vars: defaults };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  /**
   * O'zgaruvchilar ro'yxati (interfeys uchun)
   */
  getAvailableVars() {
    return [
      { key: 'tushum', label: 'Tushum', desc: 'Kunlik umumiy tushum' },
      { key: 'texnik', label: 'Texnik', desc: 'Texnik ishlar summasi' },
      { key: 'implant_count', label: 'Implant soni', desc: 'Implant miqdori' },
      { key: 'implant_sum', label: 'Implant summasi', desc: 'Implant uchun to\'langan summa' },
      { key: 'implant_value', label: 'Implant qiymati', desc: 'Bir implant uchun belgilangan summa' },
      { key: 'percent', label: 'Foiz (%)', desc: 'Vrach ulushi foizi' },
      { key: 'avans', label: 'Avans', desc: 'Olingan avans' },
    ];
  },

  /**
   * Standart formulalar
   */
  getPresetFormulas() {
    return [
      {
        name: 'Asosiy (joriy)',
        formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value',
        desc: 'Tushum dan texnikni ayirib foiz, implant soni × qiymat'
      },
      {
        name: 'Implant foizli',
        formula: '(tushum - texnik) * percent / 100 + implant_sum * 0.20',
        desc: 'Implant summaning 20%'
      },
      {
        name: 'Faqat foiz',
        formula: 'tushum * percent / 100',
        desc: 'Tushumdan to\'g\'ridan foiz'
      },
      {
        name: 'Teknik bilan',
        formula: '(tushum - texnik) * percent / 100 + texnik * 0.5',
        desc: 'Asosiy foiz + texnik 50%'
      },
    ];
  },

  /**
   * Oylik umumiy hisobot — YANGI MANTIQ
   *
   * Tushum = Barcha vrachlar tushumi yig'indisi (naqt pul dastlab)
   * Kassadagi naqt = Tushum - (Terminal + QR + Inkassa + Prechesleniya + P2P)
   * Berilishi kerak = Tushum - Umumiy avans - Xarajatlar - (Inkassa+Terminal+Prechesleniya+P2P)
   * Foyda = Tushum - Xarajatlar - Vrachlar VU - Arenda - Kommunal
   */
  async calcMonthlyTotal(clinicId, year, month) {
    const reports = await DB.getMonthlyReports(clinicId, year, month);
    const doctors = DB.getDoctors(clinicId);
    const settings = DB.getSettings(clinicId);
    // Faqat naqt bo'lmagan to'lov turlarini olish
    const paymentTypes = DB.getPaymentTypes(clinicId).filter(p => p.active && p.id !== 'naqd');

    // Kassadan ayiriladigan (bankga ketadigan) to'lov turlari
    const BANK_IDS = ['terminal', 'inkassa', 'prechesleniya', 'p2p'];

    let result = {
      tushum: 0,           // Jami vrachlar tushumi = boshlang'ich naqt pul
      payments: {},         // Naqt bo'lmagan to'lovlar bo'yicha
      nonCashTotal: 0,      // Barcha naqt bo'lmagan (Terminal+QR+Inkassa+P2P+Prechesleniya)
      bankTotal: 0,         // Faqat bank/naqt bo'lmaganlar (Inkassa+Terminal+Prechesleniya+P2P)
      kassaNaqd: 0,         // Kassadagi haqiqiy naqt pul
      totalXarajat: 0,
      xarajatByCategory: {},
      doctorStats: {},
      doctorAvansTotal: 0,  // Faqat vrachlar avansi
      nurseTotal: 0,        // Hamshiralar avansi
      umumiyAvans: 0,       // Jami avans (vrach + hamshira)
      berilishiKerak: 0,    // Oylik berilishi kerak (naqt balans)
      arenda: settings.arenda || 0,
      kommunal: settings.kommunal || 0,
      totalVU: 0,
      foyda: 0,
      reportCount: reports.length
    };

    // Har bir kun bo'yicha hisoblash
    for (const report of reports) {
      // 1. Vrachlar tushumi — ASOSIY TUSHUM MANBASI
      for (const doc of doctors) {
        const entry = (report.doctors || {})[doc.id] || {};
        result.tushum += Number(entry.tushum) || 0;
        result.doctorAvansTotal += Number(entry.avans) || 0;
      }

      // 2. Naqt bo'lmagan to'lovlar
      for (const pt of paymentTypes) {
        const amt = Number((report.payments || {})[pt.id]) || 0;
        if (amt > 0) {
          result.payments[pt.id] = (result.payments[pt.id] || 0) + amt;
          result.nonCashTotal += amt;
          if (BANK_IDS.includes(pt.id)) {
            result.bankTotal += amt;
          }
        }
      }

      // 3. Xarajatlar
      for (const exp of (report.expenses || [])) {
        const amt = Number(exp.amount) || 0;
        result.totalXarajat += amt;
        result.xarajatByCategory[exp.categoryId] = (result.xarajatByCategory[exp.categoryId] || 0) + amt;
      }

      // 4. Hamshiralar avansi
      for (const ne of Object.values(report.nurses || {})) {
        result.nurseTotal += Number(ne.avans) || 0;
      }
    }

    // Kassadagi naqt pul = Jami tushum - barcha naqt bo'lmagan to'lovlar
    result.kassaNaqd = result.tushum - result.nonCashTotal;

    // Umumiy avans = vrach avansi + hamshira avansi
    result.umumiyAvans = result.doctorAvansTotal + result.nurseTotal;

    // BERILISHI KERAK = Kassadagi naqt pul − (Umumiy avans + Xarajatlar)
    result.berilishiKerak = result.kassaNaqd - result.umumiyAvans - result.totalXarajat;

    // Vrachlar VU
    let totalVU = 0;
    for (const doc of doctors) {
      const stats = this.calcMonthlyDoctor(doc, reports);
      result.doctorStats[doc.id] = stats;
      totalVU += stats.totalVU;
    }
    result.totalVU = totalVU;

    // Foyda = Tushum - Xarajatlar - Vrachlar VU - Arenda - Kommunal
    result.foyda = result.tushum - result.totalXarajat - totalVU - result.arenda - result.kommunal;

    return result;
  }
};
