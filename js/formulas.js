/**
 * DentAdmin — Formula Engine
 * Moslashuvchan vrach ish haqi formulasi hisoblash
 *
 * YANGI TIZIM:
 * Har bir klinika o'z formula qadamlarini belgilaydi:
 * [
 *   { id: 'JTS', label: 'Jami Texnik', expr: 'texnik', type: 'sum', emoji: '📊' },
 *   { id: 'JIS', label: 'Jami Implant', expr: 'implantCount * 300000', type: 'formula', emoji: '💎' },
 *   { id: 'VU',  label: 'Vrach Ulushi', expr: '(tushum - JIS) * 0.35 + JIS', type: 'formula', emoji: '💰' },
 *   { id: 'JVB', label: 'Vrachga Beriladi', expr: 'VU + JTS - avans', type: 'result', emoji: '💚' },
 * ]
 */

const FormulaEngine = {

  // ── DEFAULT QADAMLAR (hech narsa sozlanmagan bo'lsa) ──────────────────────
  DEFAULT_STEPS: [
    {
      id: 'JTS',
      label: 'Jami Texnik Summasi',
      expr: 'texnik',
      type: 'sum',
      emoji: '📊'
    },
    {
      id: 'JIS',
      label: 'Jami Implant Summasi',
      expr: 'implantCount * implantValue',
      type: 'formula',
      emoji: '💎'
    },
    {
      id: 'VU',
      label: 'Vrach Ulushi',
      expr: '(tushum - JTS) * percent / 100 + JIS',
      type: 'formula',
      emoji: '💰'
    },
    {
      id: 'JVB',
      label: 'Jami Vrachga Beriladigan',
      expr: 'VU + JTS - avans',
      type: 'result',
      emoji: '💚'
    }
  ],

  // ── TIZIM O'ZGARUVCHILARI ─────────────────────────────────────────────────
  BASE_VARS: {
    tushum:       { label: 'Tushum',        desc: 'Kunlik umumiy tushum' },
    texnik:       { label: 'Texnik',         desc: 'Texnik ishlar summasi' },
    implantCount: { label: 'Implant soni',   desc: 'Implant miqdori' },
    implantValue: { label: 'Implant qiymati',desc: 'Bir implantning qiymati (so\'m)' },
    percent:      { label: 'Foiz (%)',       desc: 'Vrach ulushi foizi' },
    avans:        { label: 'Avans',          desc: 'Olingan avans' },
  },

  // ── SOZLAMALARDAN QADAMLARNI OLISH ───────────────────────────────────────
  getSteps(clinicId) {
    const s = DB.getSettings(clinicId);
    if (s.formulaSteps && Array.isArray(s.formulaSteps) && s.formulaSteps.length > 0) {
      return s.formulaSteps;
    }
    return this.DEFAULT_STEPS;
  },

  saveSteps(clinicId, steps) {
    DB.updateSetting(clinicId, 'formulaSteps', steps);
  },

  // ── XAVFSIZ HISOBLASH ────────────────────────────────────────────────────
  _eval(expr, vars) {
    try {
      // O'zgaruvchilarni uzun nomdan qisqaga qarab almashtirish
      let e = String(expr);
      const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
      for (const k of keys) {
        e = e.replace(new RegExp(`\\b${k}\\b`, 'g'), String(Number(vars[k]) || 0));
      }
      // Faqat raqam va matematik amallar ruxsat
      if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(e)) {
        console.warn('Xavfli formula iborasi:', e);
        return 0;
      }
      const r = Function('"use strict"; return (' + e + ')')();
      return isFinite(r) ? Math.round(r) : 0;
    } catch (err) {
      console.error('Formula xatosi:', err);
      return 0;
    }
  },

  // ── FORMULA IFODASINI INSONGA O'QILADIGAN MATNGA AYLANTIRISH ─────────────
  buildExprText(expr, vars) {
    let e = String(expr);
    const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      const val = Number(vars[k]) || 0;
      e = e.replace(new RegExp(`\\b${k}\\b`, 'g'), val.toLocaleString('ru-RU').replace(/,/g,' '));
    }
    // * → ×, / → ÷
    e = e.replace(/\*/g, '×').replace(/\//g, '÷');
    return e;
  },

  // ── QADAMLAR BO'YICHA HISOBLASH (to'liq tafsilot bilan) ──────────────────
  /**
   * Qaytaradi: [ { id, label, emoji, type, exprText, value }, ... ]
   */
  calcSteps(clinicId, totals) {
    const steps = this.getSteps(clinicId);
    const doc = totals.doctor || {};

    // Asosiy o'zgaruvchilar
    let vars = {
      tushum:       Number(totals.tushum)       || 0,
      texnik:       Number(totals.texnik)        || 0,
      implantCount: Number(totals.implantCount)  || 0,
      implantValue: Number(doc.implantValue)     || 0,
      percent:      Number(doc.percent)          || 0,
      avans:        Number(totals.avans)         || 0,
    };

    // Dinamik o'zgaruvchilar — totals dagi barcha qo'shimcha kalitlar (rentgen_soni, vinir, ...)
    Object.entries(totals).forEach(([k, v]) => {
      if (k !== 'doctor' && !(k in vars)) {
        const n = Number(v);
        if (!isNaN(n)) vars[k] = n;
      }
    });

    const result = [];

    for (const step of steps) {
      const val     = this._eval(step.expr, vars);
      const exprTxt = this.buildExprText(step.expr, vars);

      result.push({
        id:       step.id,
        label:    step.label,
        emoji:    step.emoji || '📌',
        type:     step.type || 'formula',
        exprText: exprTxt,
        value:    val,
      });

      // Bu qadam natijasini keyingi qadamlar uchun o'zgaruvchi sifatida qo'shish
      vars[step.id] = val;
    }

    return result;
  },

  // ── YAKUNIY NATIJA (eng so'nggi "result" yoki oxirgi qadam) ───────────────
  getFinalResult(stepResults) {
    // Birinchi "result" tipidagi qadam, yo'q bo'lsa — oxirgi qadam
    const r = stepResults.find(s => s.type === 'result') || stepResults[stepResults.length - 1];
    return r ? r.value : 0;
  },

  // ── VRACH OYLIK HISOB-KITOBI (steps asosida) ─────────────────────────────
  calcMonthlyDoctorSteps(clinicId, doctor, monthDays) {
    let totalTushum = 0, totalTexnik = 0, totalImplantCount = 0, totalAvans = 0;

    for (const day of monthDays) {
      const entry = (day.doctors || {})[doctor.id] || {};
      totalTushum      += Number(entry.tushum)       || 0;
      totalTexnik      += Number(entry.texnik)        || 0;
      totalImplantCount += Number(entry.implantCount) || 0;
      totalAvans       += Number(entry.avans)         || 0;
    }

    const stepResults = this.calcSteps(clinicId, {
      tushum:       totalTushum,
      texnik:       totalTexnik,
      implantCount: totalImplantCount,
      avans:        totalAvans,
      doctor,
    });

    const finalVal = this.getFinalResult(stepResults);

    return {
      totalTushum,
      totalTexnik,
      totalImplantCount,
      totalAvans,
      stepResults,
      totalVU: finalVal,
      berilishiKerak: finalVal - totalAvans,
    };
  },

  // ── ESKI INTERFEYSLARNI QOLLAB-QUVVATLASH ────────────────────────────────
  /**
   * Eski kodlar uchun (calcMonthlyDoctor) — hali ham ishlaydi
   */
  calcMonthlyDoctor(doctor, monthDays) {
    let totalTushum = 0, totalTexnik = 0, totalImplantCount = 0, totalImplantSum = 0;
    let totalVU = 0, totalAvans = 0;

    for (const day of monthDays) {
      const entry = (day.doctors || {})[doctor.id] || {};
      totalTushum      += Number(entry.tushum)       || 0;
      totalTexnik      += Number(entry.texnik)        || 0;
      totalImplantCount += Number(entry.implantCount) || 0;
      totalImplantSum   += Number(entry.implantSum)   || 0;
      totalAvans        += Number(entry.avans)        || 0;
      const vu = this.calcVU(doctor, {
        tushum:       entry.tushum       || 0,
        texnik:       entry.texnik        || 0,
        implantCount: entry.implantCount  || 0,
        implantSum:   entry.implantSum    || 0,
        avans: 0
      });
      totalVU += vu;
    }

    return {
      totalTushum, totalTexnik, totalImplantCount, totalImplantSum,
      totalVU, totalAvans,
      berilishiKerak: totalVU - totalAvans,
    };
  },

  calcVU(doctor, dayData) {
    const { tushum = 0, texnik = 0, implantCount = 0, implantSum = 0, avans = 0 } = dayData;
    const vars = {
      tushum, texnik,
      implant_count: implantCount, implantCount,
      implant_sum:   implantSum,
      implant_value: doctor.implantValue || 0,
      implantValue:  doctor.implantValue || 0,
      percent: doctor.percent || 0,
      avans
    };
    const formula = doctor.formula || `(tushum - texnik) * percent / 100`;
    return Math.max(0, this._eval(formula, vars));
  },

  // ── FORMULA TESTLASH ──────────────────────────────────────────────────────
  testFormula(formula, sampleVars) {
    const defaults = {
      tushum: 1000000, texnik: 200000, implantCount: 2,
      implantValue: 300000, percent: 35, avans: 100000,
      ...sampleVars
    };
    try {
      const result = this._eval(formula, defaults);
      return { ok: true, result, vars: defaults };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // ── MAVJUD O'ZGARUVCHILAR RO'YXATI ────────────────────────────────────────
  getAvailableVars() {
    return [
      { key: 'tushum',       label: 'Tushum',         desc: 'Kunlik umumiy tushum' },
      { key: 'texnik',       label: 'Texnik',          desc: 'Texnik ishlar summasi' },
      { key: 'implantCount', label: 'Implant soni',    desc: 'Implant miqdori' },
      { key: 'implantValue', label: 'Implant qiymati', desc: 'Bir implant uchun qiymat' },
      { key: 'percent',      label: 'Foiz (%)',        desc: 'Vrach ulushi foizi' },
      { key: 'avans',        label: 'Avans',           desc: 'Olingan avans' },
    ];
  },

  getPresetFormulas() {
    return [
      { name: 'Asosiy (joriy)', formula: '(tushum - texnik) * percent / 100 + implantCount * implantValue', desc: 'Texnik ayirib foiz + implant' },
      { name: 'Faqat foiz',     formula: 'tushum * percent / 100', desc: 'Tushumdan to\'g\'ridan foiz' },
      { name: 'Implant foizli', formula: '(tushum - texnik) * percent / 100 + implantCount * implantValue * 0.2', desc: 'Implant qiymatning 20%' },
    ];
  },

  // ── OYLIK UMUMIY HISOBOT ──────────────────────────────────────────────────
  async calcMonthlyTotal(clinicId, year, month) {
    const reports     = await DB.getMonthlyReports(clinicId, year, month);
    const doctors     = DB.getDoctors(clinicId);
    const settings    = DB.getSettings(clinicId);
    const paymentTypes = DB.getPaymentTypes(clinicId).filter(p => p.active && p.id !== 'naqd');
    const BANK_IDS    = ['terminal', 'inkassa', 'prechesleniya', 'p2p'];

    let result = {
      tushum: 0, payments: {}, nonCashTotal: 0, bankTotal: 0,
      kassaNaqd: 0, totalXarajat: 0, xarajatByCategory: {},
      doctorStats: {}, doctorAvansTotal: 0, nurseTotal: 0, umumiyAvans: 0,
      berilishiKerak: 0, arenda: settings.arenda || 0, kommunal: settings.kommunal || 0,
      totalVU: 0, foyda: 0, reportCount: reports.length
    };

    for (const report of reports) {
      for (const doc of doctors) {
        const entry = (report.doctors || {})[doc.id] || {};
        result.tushum          += Number(entry.tushum) || 0;
        result.doctorAvansTotal += Number(entry.avans)  || 0;
      }
      for (const pt of paymentTypes) {
        const amt = Number((report.payments || {})[pt.id]) || 0;
        if (amt > 0) {
          result.payments[pt.id]  = (result.payments[pt.id] || 0) + amt;
          result.nonCashTotal     += amt;
          if (BANK_IDS.includes(pt.id)) result.bankTotal += amt;
        }
      }
      for (const exp of (report.expenses || [])) {
        const amt = Number(exp.amount) || 0;
        result.totalXarajat += amt;
        result.xarajatByCategory[exp.categoryId] = (result.xarajatByCategory[exp.categoryId] || 0) + amt;
      }
      for (const ne of Object.values(report.nurses || {})) {
        result.nurseTotal += Number(ne.avans) || 0;
      }
    }

    result.kassaNaqd      = result.tushum - result.nonCashTotal;
    result.umumiyAvans    = result.doctorAvansTotal + result.nurseTotal;
    result.berilishiKerak = result.kassaNaqd - result.umumiyAvans - result.totalXarajat;

    let totalVU = 0;
    for (const doc of doctors) {
      const stats = this.calcMonthlyDoctor(doc, reports);
      result.doctorStats[doc.id] = stats;
      totalVU += stats.totalVU;
    }
    result.totalVU = totalVU;
    result.foyda   = result.tushum - result.totalXarajat - totalVU - result.arenda - result.kommunal;

    return result;
  },

  evaluate(formula, vars) { return this._eval(formula, vars); }
};
