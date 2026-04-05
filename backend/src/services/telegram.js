/**
 * DentAdmin — Telegram xabar quruvchi servis
 *
 * Hozircha faqat xabar matnini qaytaradi.
 * Keyingi bosqichda node-telegram-bot-api orqali yuboriladi.
 */

const MONTHS_UZ = [
  '', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

function fmt(n) {
  return Math.round(n || 0).toLocaleString('ru-RU'); // 1 234 567 formatida
}

/**
 * Ish kunlari qolganini hisoblash (oddiy — dam olish kunlarsiz)
 * @param {Date} date - joriy sana
 * @returns {number} - oyning qolgan kunlari
 */
function remainingDaysInMonth(date = new Date()) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return lastDay - date.getDate();
}

/**
 * Vrach uchun kunlik "Kun yopildi" xabarini qurish
 *
 * @param {Object} doctor      - { name, monthlyGoal }
 * @param {Object} dayEntry    - { tushum, texnik, implantCount, avans }
 * @param {Object} monthTotals - { jTushum, jvb } — oy boshidan hozirga qadar
 * @param {string} dateStr     - "2026-04-05"
 * @returns {string} Telegram MarkdownV2 xabar matni
 */
function buildDayCloseMessage(doctor, dayEntry, monthTotals, dateStr) {
  const date  = dateStr ? new Date(dateStr) : new Date();
  const day   = date.getDate();
  const month = MONTHS_UZ[date.getMonth() + 1];
  const year  = date.getFullYear();

  const tushum       = dayEntry.tushum       || 0;
  const avans        = dayEntry.avans        || 0;
  const implantCount = dayEntry.implantCount || 0;

  // Kunlik JVB (vrach ulushi — formulasiz oddiy hisob, backend da tasdiq uchun)
  const dayJVB       = monthTotals.dayJVB    || 0;

  // Oy bo'yicha jami JVB
  const monthJVB     = monthTotals.jvb       || 0;

  const goal         = parseInt(doctor.monthlyGoal) || 0;
  const goalRemain   = goal > 0 ? Math.max(0, goal - monthJVB) : 0;
  const daysLeft     = remainingDaysInMonth(date);

  let lines = [];
  lines.push(`🦷 *DentAdmin — Kunlik Hisobot*`);
  lines.push(`📅 ${day} ${month} ${year}`);
  lines.push(`━━━━━━━━━━━━━━━━`);
  lines.push(`👨‍⚕️ *${doctor.name}*`);
  lines.push(``);
  lines.push(`💰 Bugungi tushum: *${fmt(tushum)} so'm*`);
  if (implantCount > 0) {
    lines.push(`🦷 Implant: *${implantCount} ta*`);
  }
  lines.push(`💸 Avans olindi: *${fmt(avans)} so'm*`);
  lines.push(`📤 Bugungi JVB: *${fmt(dayJVB)} so'm*`);
  lines.push(``);

  if (goal > 0) {
    const pct = Math.round((monthJVB / goal) * 100);
    const bar = buildProgressBar(pct);
    lines.push(`🎯 *Oylik maqsad:* ${fmt(goal)} so'm`);
    lines.push(`${bar} ${pct}%`);
    lines.push(`✅ Oy bo'yicha jami JVB: *${fmt(monthJVB)} so'm*`);
    lines.push(`⏳ Maqsadga qoldi: *${fmt(goalRemain)} so'm*`);
    if (daysLeft > 0) {
      lines.push(`📆 Oyda *${daysLeft}* kun qoldi — Omad! 💪`);
    } else {
      lines.push(`🏁 Oy yakunlandi!`);
    }
    lines.push(``);
  }

  lines.push(`━━━━━━━━━━━━━━━━`);
  lines.push(`Hisobotni tasdiqlang:`);

  return lines.join('\n');
}

/** Oddiy matn progressbar (Telegram uchun) */
function buildProgressBar(pct) {
  const filled = Math.round(Math.min(pct, 100) / 10);
  const empty  = 10 - filled;
  return '🟩'.repeat(filled) + '⬜'.repeat(empty);
}

/**
 * Tasdiqlash xabarini qurish (vrach rad etganda / muvofiq bo'lmaganda)
 */
function buildConfirmMessage(doctor, dateStr, status) {
  const statusText = {
    confirmed: '✅ Tasdiqlandi',
    rejected:  '❌ Rad etildi',
    disputed:  '🔄 Tuzatish talab qilindi',
  }[status] || status;

  return `📊 *${doctor.name}*\n📅 ${dateStr}\n${statusText}`;
}

module.exports = { buildDayCloseMessage, buildConfirmMessage, remainingDaysInMonth };
