/**
 * Admin Settings Page
 */

const AdminSettings = {
  clinicId: null,
  activeTab: 'general',

  render(params = {}) {
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (!session) return;
    this.clinicId = session.clinicId;

    const content = `
      ${Components.renderPageHeader('⚙️ Klinika sozlamalari', 'Foizlar, to\'lov turlari va boshqa parametrlar')}
      <div class="page-body">
        <div class="settings-grid">
          <div class="settings-nav">
            ${['general', 'daily_vars', 'payment_types', 'expense_cats', 'formula_builder', 'users'].map(tab => `
              <div class="settings-nav-item ${this.activeTab === tab ? 'active' : ''}" onclick="AdminSettings.switchTab('${tab}')">
                ${{ general: '🏥 Umumiy', daily_vars: '📥 Kunlik maydonlar', payment_types: '💳 To\'lov turlari', expense_cats: '📂 Xarajat turlari', formula_builder: '💡 Maosh formulasi', users: '👤 Foydalanuvchilar' }[tab]}
              </div>
            `).join('')}
          </div>
          <div id="settings-panel">
            ${this.renderPanel()}
          </div>
        </div>
      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/admin/settings', content);
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.settings-nav-item').forEach((el, i) => {
      el.classList.toggle('active', ['general', 'daily_vars', 'payment_types', 'expense_cats', 'formula_builder', 'users'][i] === tab);
    });
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  renderPanel() {
    switch (this.activeTab) {
      case 'general':          return this.renderGeneral();
      case 'daily_vars':       return this.renderDailyVars();
      case 'payment_types':    return this.renderPaymentTypes();
      case 'expense_cats':     return this.renderExpenseCats();
      case 'formula_builder':  return this.renderFormulaBuilder();
      case 'users':            return this.renderUsers();
      default: return '';
    }
  },

  renderGeneral() {
    const s = DB.getSettings(this.clinicId);
    const clinic = DB.getClinicById(this.clinicId);
    return `
      <div class="settings-panel-title">🏥 Umumiy sozlamalar</div>

      <div class="settings-section">
        <div class="settings-section-title">Klinika ma'lumotlari</div>
        <div class="form-row form-row-2" style="gap:var(--sp-4);">
          <div class="form-group">
            <label class="label">Klinika nomi</label>
            <input class="input" id="set-clinic-name" value="${clinic?.name || ''}" />
          </div>
          <div class="form-group">
            <label class="label">Telefon</label>
            <input class="input" id="set-clinic-phone" value="${clinic?.phone || ''}" />
          </div>
          <div class="form-group">
            <label class="label">Manzil</label>
            <input class="input" id="set-clinic-address" value="${clinic?.address || ''}" />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Moliyaviy parametrlar</div>
        <div class="form-row form-row-2" style="gap:var(--sp-4);">
          <div class="form-group">
            <label class="label">💱 Dollar kursi (so'm)</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">$ =</span>
              <input class="input" type="number" id="set-dollar-rate" value="${s.dollarRate || 12700}" />
            </div>
          </div>
          <div class="form-group">
            <label class="label">🏠 Arenda (oylik, so'm)</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">so'm</span>
              <input class="input" type="number" id="set-arenda" value="${s.arenda || 0}" />
            </div>
          </div>
          <div class="form-group">
            <label class="label">⚡ Kommunal (oylik, so'm)</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">so'm</span>
              <input class="input" type="number" id="set-kommunal" value="${s.kommunal || 0}" />
            </div>
          </div>
          <div class="form-group">
            <label class="label">💼 Rahbar shaxsiy xarajat (oylik)</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">so'm</span>
              <input class="input" type="number" id="set-shaxruz-xarajat" value="${s.shaxruzXarajat || 0}" />
            </div>
          </div>
        </div>
        <div class="hint" style="margin-top:var(--sp-2)">Bu summalar foyda hisoblanishida avtomatik ayiriladi</div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">🦷 Implant maydoni sozlamalari</div>
        <div class="form-row form-row-2" style="gap:var(--sp-4)">
          <div class="form-group">
            <label class="label">Maydon nomi (kunlik kiritishda ko'rinadigan)</label>
            <input class="input" id="set-implant-label" value="${s.implantLabel || 'Implant'}" placeholder="Implant" />
            <div class="hint">Masalan: Rentgen, Protez, Implant — klinikaga mos nom kiriting</div>
          </div>
          <div class="form-group">
            <label class="label">Maydonni ko'rsatish</label>
            <div style="display:flex;align-items:center;gap:var(--sp-3);margin-top:var(--sp-2)">
              <div class="toggle-wrap" id="implant-toggle-wrap"
                onclick="this.querySelector('.toggle').classList.toggle('on');AdminSettings._updateImplantHint()">
                <div class="toggle ${s.showImplant !== false ? 'on' : ''}" id="implant-show-toggle"></div>
              </div>
              <span id="implant-toggle-hint" style="font-size:var(--text-sm);color:var(--text-muted)">
                ${s.showImplant !== false ? '✅ Kunlik kiritishda ko\'rinadi' : '⛔ Yashirilgan'}
              </span>
            </div>
            <div class="hint" style="margin-top:var(--sp-2)">Yoqilmasa — bu klinikada ko'rsatilmaydi</div>
          </div>
        </div>
      </div>

      <div class="form-row" style="justify-content:flex-start;margin-top:var(--sp-6)">
        <button class="btn btn-primary" onclick="AdminSettings.saveGeneral()">
          ${Utils.icon('save', 14)} Saqlash
        </button>
      </div>
    `;
  },

  saveGeneral() {
    const dollarRate     = Utils.num(document.getElementById('set-dollar-rate')?.value);
    const arenda         = Utils.num(document.getElementById('set-arenda')?.value);
    const kommunal       = Utils.num(document.getElementById('set-kommunal')?.value);
    const shaxruzXarajat = Utils.num(document.getElementById('set-shaxruz-xarajat')?.value);
    const clinicName     = document.getElementById('set-clinic-name')?.value?.trim();
    const phone          = document.getElementById('set-clinic-phone')?.value?.trim();
    const address        = document.getElementById('set-clinic-address')?.value?.trim();
    const implantLabel   = document.getElementById('set-implant-label')?.value?.trim() || 'Implant';
    const showImplant    = document.getElementById('implant-show-toggle')?.classList.contains('on') !== false;

    DB.updateSettings(this.clinicId, { dollarRate, arenda, kommunal, shaxruzXarajat, implantLabel, showImplant });
    const clinic = DB.getClinicById(this.clinicId);
    if (clinic) { clinic.name = clinicName; clinic.phone = phone; clinic.address = address; DB.saveClinic(clinic); }
    Utils.toast('success', 'Sozlamalar saqlandi');
  },

  _updateImplantHint() {
    const on = document.getElementById('implant-show-toggle')?.classList.contains('on');
    const hint = document.getElementById('implant-toggle-hint');
    if (hint) hint.textContent = on ? '✅ Kunlik kiritishda ko\'rinadi' : '⛔ Yashirilgan';
  },

  renderPaymentTypes() {
    const pts = DB.getPaymentTypes(this.clinicId);
    return `
      <div class="settings-panel-title">💳 To'lov turlari</div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-5);" id="pt-list">
        ${pts.map((pt, i) => `
          <div class="doctor-row" style="gap:var(--sp-3)">
            <span style="font-size:22px;width:32px;text-align:center">${pt.icon || '💰'}</span>
            <input class="input" style="flex:1" value="${pt.name}" id="pt-name-${i}" />
            <input class="input" style="width:60px" value="${pt.icon || ''}" id="pt-icon-${i}" placeholder="emoji" />
            <div class="toggle-wrap" onclick="this.querySelector('.toggle').classList.toggle('on')">
              <div class="toggle ${pt.active ? 'on' : ''}"></div>
            </div>
            ${!pt.builtin ? `<button class="btn btn-danger btn-sm btn-icon" onclick="AdminSettings.deletePaymentType(${i})">${Utils.icon('trash', 14)}</button>` : '<div style="width:32px"></div>'}
          </div>
        `).join('')}
      </div>
      <div style="display:flex;gap:var(--sp-3);align-items:center;margin-bottom:var(--sp-5);">
        <input class="input" id="new-pt-icon" placeholder="🏧 emoji" style="width:70px" />
        <input class="input" id="new-pt-name" placeholder="Yangi to'lov turi nomi" />
        <button class="btn btn-secondary" onclick="AdminSettings.addPaymentType()">
          ${Utils.icon('plus', 14)} Qo'shish
        </button>
      </div>
      <button class="btn btn-primary" onclick="AdminSettings.savePaymentTypes()">
        ${Utils.icon('save', 14)} Saqlash
      </button>
    `;
  },

  addPaymentType() {
    const icon = document.getElementById('new-pt-icon')?.value?.trim() || '💰';
    const name = document.getElementById('new-pt-name')?.value?.trim();
    if (!name) { Utils.toast('error', 'Nom kiriting'); return; }
    const pts = DB.getPaymentTypes(this.clinicId);
    pts.push({ id: DB.generateId('pt_'), name, icon, active: true, builtin: false });
    DB.savePaymentTypes(this.clinicId, pts);
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  deletePaymentType(idx) {
    const pts = DB.getPaymentTypes(this.clinicId);
    pts.splice(idx, 1);
    DB.savePaymentTypes(this.clinicId, pts);
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  savePaymentTypes() {
    const pts = DB.getPaymentTypes(this.clinicId);
    const ptItems = document.querySelectorAll('#pt-list .doctor-row');
    ptItems.forEach((row, i) => {
      if (pts[i]) {
        pts[i].name = document.getElementById(`pt-name-${i}`)?.value || pts[i].name;
        pts[i].icon = document.getElementById(`pt-icon-${i}`)?.value || pts[i].icon;
        const toggle = row.querySelector('.toggle');
        pts[i].active = toggle?.classList.contains('on') ?? pts[i].active;
      }
    });
    DB.savePaymentTypes(this.clinicId, pts);
    Utils.toast('success', 'To\'lov turlari saqlandi');
  },

  renderExpenseCats() {
    const cats = DB.getExpenseCategories(this.clinicId);
    return `
      <div class="settings-panel-title">📂 Xarajat kategoriyalari</div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-5);" id="cat-list">
        ${cats.map((cat, i) => `
          <div class="doctor-row">
            <input class="input" style="flex:1" value="${cat.name}" id="cat-name-${i}" />
            <div class="toggle-wrap" onclick="this.querySelector('.toggle').classList.toggle('on')">
              <div class="toggle ${cat.active !== false ? 'on' : ''}"></div>
            </div>
            <button class="btn btn-danger btn-sm btn-icon" onclick="AdminSettings.deleteExpenseCat(${i})">${Utils.icon('trash', 14)}</button>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;gap:var(--sp-3);margin-bottom:var(--sp-5);">
        <input class="input" id="new-cat-name" placeholder="Yangi kategoriya nomi" />
        <button class="btn btn-secondary" onclick="AdminSettings.addExpenseCat()">
          ${Utils.icon('plus', 14)} Qo'shish
        </button>
      </div>
      <button class="btn btn-primary" onclick="AdminSettings.saveExpenseCats()">
        ${Utils.icon('save', 14)} Saqlash
      </button>
    `;
  },

  addExpenseCat() {
    const name = document.getElementById('new-cat-name')?.value?.trim();
    if (!name) { Utils.toast('error', 'Nom kiriting'); return; }
    const cats = DB.getExpenseCategories(this.clinicId);
    cats.push({ id: DB.generateId('cat_'), name, active: true });
    DB.saveExpenseCategories(this.clinicId, cats);
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  deleteExpenseCat(idx) {
    const cats = DB.getExpenseCategories(this.clinicId);
    cats.splice(idx, 1);
    DB.saveExpenseCategories(this.clinicId, cats);
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  saveExpenseCats() {
    const cats = DB.getExpenseCategories(this.clinicId);
    document.querySelectorAll('#cat-list .doctor-row').forEach((row, i) => {
      if (cats[i]) {
        cats[i].name = document.getElementById(`cat-name-${i}`)?.value || cats[i].name;
        const toggle = row.querySelector('.toggle');
        cats[i].active = toggle?.classList.contains('on') ?? true;
      }
    });
    DB.saveExpenseCategories(this.clinicId, cats);
    Utils.toast('success', 'Saqlandi');
  },

  renderCustomFields() {
    const fields = DB.getCustomFields(this.clinicId);
    return `
      <div class="settings-panel-title">🔧 Qo'shimcha maydonlar</div>
      <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--sp-5);">
        Kunlik hisobotga qo'shimcha maydonlar qo'shing (masalan: rentgen soni, boshqa xizmat)
      </p>
      <div style="display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-5);" id="cf-list">
        ${fields.map((f, i) => `
          <div class="doctor-row">
            <input class="input" style="flex:1" value="${f.name}" id="cf-name-${i}" placeholder="Maydon nomi" />
            <select class="select" id="cf-type-${i}" style="width:120px">
              <option value="number"   ${f.type === 'number'   ? 'selected' : ''}>Raqam</option>
              <option value="text"     ${f.type === 'text'     ? 'selected' : ''}>Matn</option>
              <option value="currency" ${f.type === 'currency' ? 'selected' : ''}>So'm</option>
            </select>
            <select class="select" id="cf-target-${i}" style="width:110px">
              <option value="daily"   ${f.target === 'daily'   ? 'selected' : ''}>Kunlik</option>
              <option value="doctor"  ${f.target === 'doctor'  ? 'selected' : ''}>Vrach</option>
              <option value="expense" ${f.target === 'expense' ? 'selected' : ''}>Xarajat</option>
            </select>
            <button class="btn btn-danger btn-sm btn-icon" onclick="AdminSettings.deleteCustomField(${i})">${Utils.icon('trash', 14)}</button>
          </div>
        `).join('') || '<div style="color:var(--text-muted);font-size:var(--text-sm)">Hech qanday qo\'shimcha maydon yo\'q</div>'}
      </div>
      <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap;margin-bottom:var(--sp-5);">
        <input class="input" id="new-cf-name" placeholder="Maydon nomi (rentgen soni...)" style="flex:1;min-width:200px" />
        <select class="select" id="new-cf-type" style="width:120px">
          <option value="number">Raqam</option>
          <option value="currency">So'm</option>
          <option value="text">Matn</option>
        </select>
        <select class="select" id="new-cf-target" style="width:110px">
          <option value="daily">Kunlik</option>
          <option value="doctor">Vrach</option>
        </select>
        <button class="btn btn-secondary" onclick="AdminSettings.addCustomField()">
          ${Utils.icon('plus', 14)} Qo'shish
        </button>
      </div>
      <button class="btn btn-primary" onclick="AdminSettings.saveCustomFields()">
        ${Utils.icon('save', 14)} Saqlash
      </button>
    `;
  },

  addCustomField() {
    const name   = document.getElementById('new-cf-name')?.value?.trim();
    const type   = document.getElementById('new-cf-type')?.value || 'number';
    const target = document.getElementById('new-cf-target')?.value || 'daily';
    if (!name) { Utils.toast('error', 'Nom kiriting'); return; }
    const fields = DB.getCustomFields(this.clinicId);
    fields.push({ id: DB.generateId('cf_'), name, type, target });
    DB.saveCustomFields(this.clinicId, fields);
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  deleteCustomField(idx) {
    const fields = DB.getCustomFields(this.clinicId);
    fields.splice(idx, 1);
    DB.saveCustomFields(this.clinicId, fields);
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  saveCustomFields() {
    const fields = DB.getCustomFields(this.clinicId);
    document.querySelectorAll('#cf-list .doctor-row').forEach((row, i) => {
      if (fields[i]) {
        fields[i].name   = document.getElementById(`cf-name-${i}`)?.value   || fields[i].name;
        fields[i].type   = document.getElementById(`cf-type-${i}`)?.value   || fields[i].type;
        fields[i].target = document.getElementById(`cf-target-${i}`)?.value || fields[i].target;
      }
    });
    DB.saveCustomFields(this.clinicId, fields);
    Utils.toast('success', 'Saqlandi');
  },

  // ================================================================
  // 👤 FOYDALANUVCHILAR BOSHQARUVI
  // ================================================================

  renderUsers() {
    const users = DB.getUsers().filter(u => u.clinicId === this.clinicId);
    const docs   = users.filter(u => u.role === 'doctor');
    const nurses = users.filter(u => u.role === 'nurse');
    const kassirs = users.filter(u => u.role === 'receptionist');
    const rahbars = users.filter(u => u.role === 'admin');

    return `
      <div class="settings-panel-title">👤 Foydalanuvchilar boshqaruvi</div>

      <!-- ROL IZOHI -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-5);">
        ${[
          { icon:'👑', label:'Rahbar',   desc:'Barcha hisobotlar va sozlamalar', color:'var(--brand-primary)' },
          { icon:'💼', label:'Kassir',   desc:'Kunlik kiritish, 17:30–17:50 kun yopish', color:'var(--brand-success)' },
          { icon:'👨‍⚕️', label:'Vrach',    desc:'Telegram orqali o\'z tushumi tasdiqlanadi', color:'#22d3ee' },
          { icon:'👩‍⚕️', label:'Hamshira', desc:"Faqat avans olgan kuni xabar keladi", color:'#ec4899' },
        ].map(r => `
          <div style="padding:var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);border:1px solid var(--border-subtle);border-left:3px solid ${r.color};">
            <div style="font-size:13px;font-weight:700;margin-bottom:3px;">${r.icon} ${r.label}</div>
            <div style="font-size:11px;color:var(--text-muted);">${r.desc}</div>
          </div>
        `).join('')}
      </div>

      <!-- FOYDALANUVCHILAR RO'YXATI -->
      <div style="display:flex;flex-direction:column;gap:var(--sp-2);margin-bottom:var(--sp-4);" id="users-list-panel">
        ${users.length ? users.map(u => this._renderUserRow(u)).join('') : `
          <div class="empty-state" style="padding:var(--sp-6)">
            <div class="empty-icon">👤</div>
            <div class="empty-title">Hali foydalanuvchi qo'shilmagan</div>
          </div>
        `}
      </div>

      <button class="btn btn-primary" onclick="AdminSettings.openAddUser()">
        ${Utils.icon('plus', 14)} Yangi foydalanuvchi qo'shish
      </button>

      <!-- KUN YOPILDI — BILDIRISHNOMA PREVIEW -->
      <div style="margin-top:var(--sp-6);border-radius:var(--r-lg);overflow:hidden;border:1px solid rgba(99,102,241,0.25);">
        <div style="background:rgba(99,102,241,0.12);padding:var(--sp-3) var(--sp-4);font-size:var(--text-sm);font-weight:700;color:var(--brand-primary);">
          🔔 "Kun yopildi" — Telegram bot bildirishnoma rejasi
        </div>
        <div style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">

          <div style="display:flex;align-items:flex-start;gap:var(--sp-3);">
            <div style="font-size:22px;flex-shrink:0;">💼</div>
            <div>
              <div style="font-weight:700;font-size:var(--text-sm);">Kassir (${kassirs.length} ta)</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                Soat <strong>17:30–17:50</strong> oralig'ida "⛔ Kun yopildi" tugmasini bosadi.
                Barcha ma'lumotlar tekshirilib, tasdiqlash xabarlari yuboriladi.
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:flex-start;gap:var(--sp-3);">
            <div style="font-size:22px;flex-shrink:0;">👨‍⚕️</div>
            <div>
              <div style="font-weight:700;font-size:var(--text-sm);">Vrachlar (${docs.length} ta) — har biri faqat o'ziga</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                📨 Tushum, texnik, implant, avans ko'rinadi.
                <strong>✅ Tasdiqlash</strong> / <strong>❌ Rad qilish</strong> / <strong>✏️ Tuzatish taklifi</strong>
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:flex-start;gap:var(--sp-3);">
            <div style="font-size:22px;flex-shrink:0;">👩‍⚕️</div>
            <div>
              <div style="font-weight:700;font-size:var(--text-sm);">Hamshiralar (${nurses.length} ta) — shartli</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                📨 Faqat <strong>avans olgan</strong> kuni xabar keladi. Avans olmagan kunlari xabar yuborilmaydi.
              </div>
            </div>
          </div>

          ${docs.filter(u => !u.telegramId).length || nurses.filter(u => !u.telegramId).length ? `
            <div style="padding:var(--sp-3);background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:var(--r-md);font-size:12px;color:var(--brand-warning);">
              ⚠️ ${docs.filter(u => !u.telegramId).length + nurses.filter(u => !u.telegramId).length} ta foydalanuvchida Telegram ID yo'q — ularga xabar yetmaydi
            </div>
          ` : `
            <div style="padding:var(--sp-3);background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:var(--r-md);font-size:12px;color:var(--brand-success);">
              ✅ Barcha foydalanuvchilar Telegram orqali ulangan
            </div>
          `}
        </div>
      </div>
    `;
  },

  _renderUserRow(u) {
    const roleColors = {
      admin:         'var(--brand-primary)',
      receptionist:  'var(--brand-success)',
      doctor:        '#22d3ee',
      nurse:         '#ec4899'
    };
    const roleLabels = {
      admin:        '👑 Rahbar',
      receptionist: '💼 Kassir',
      doctor:       '👨‍⚕️ Vrach',
      nurse:        '👩‍⚕️ Hamshira'
    };
    const color = roleColors[u.role] || 'var(--text-muted)';
    const safeName = (u.fullName || '').replace(/'/g, "\\'");
    return `
      <div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);background:var(--bg-elevated);border-radius:var(--r-lg);border:1px solid var(--border-subtle);border-left:3px solid ${color};">
        <div class="doctor-avatar" style="background:${color};width:38px;height:38px;font-size:13px;flex-shrink:0;">
          ${Utils.getInitials(u.fullName)}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:3px;">${u.fullName}</div>
          <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;align-items:center;">
            <span style="font-size:11px;padding:2px 8px;background:${color}22;color:${color};border-radius:20px;font-weight:600;">
              ${roleLabels[u.role] || u.role}
            </span>
            ${u.username ? `<span style="font-size:11px;color:var(--text-muted);">@${u.username}</span>` : ''}
            ${u.telegramId
              ? `<span style="font-size:11px;color:#22d3ee;">✈️ ${u.telegramId}</span>`
              : `<span style="font-size:11px;color:var(--brand-warning);">⚠️ Telegram yo'q</span>`
            }
          </div>
        </div>
        <div style="display:flex;gap:var(--sp-2);">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="AdminSettings.openEditUser('${u.id}')" title="Tahrirlash">
            ${Utils.icon('edit', 14)}
          </button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="AdminSettings.confirmDeleteUser('${u.id}','${safeName}')" title="O'chirish">
            ${Utils.icon('trash', 14)}
          </button>
        </div>
      </div>
    `;
  },

  _buildUserModal(user = null) {
    const doctors = DB.getDoctors(this.clinicId);
    const nurses  = DB.getNurses(this.clinicId);
    const isEdit  = !!user;
    const role    = user?.role || 'receptionist';

    return `
      <div class="modal-header">
        <div class="modal-title">${isEdit ? '✏️ Foydalanuvchi tahrirlash' : '➕ Yangi foydalanuvchi'}</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--sp-4);">

        <!-- ROL -->
        <div class="form-group">
          <label class="label">🎭 Lavozim / Rol *</label>
          <select class="select" id="u-role" onchange="AdminSettings._onRoleChange(this.value)">
            <option value="receptionist" ${role==='receptionist'?'selected':''}>💼 Kassir — kunlik kiritish</option>
            <option value="admin"        ${role==='admin'?'selected':''}>👑 Rahbar — barcha sozlamalar</option>
            <option value="doctor"       ${role==='doctor'?'selected':''}>👨‍⚕️ Vrach — Telegram tasdiqlash</option>
            <option value="nurse"        ${role==='nurse'?'selected':''}>👩‍⚕️ Hamshira — avans bo'lsa xabar</option>
          </select>
        </div>

        <!-- KASSIR / RAHBAR — manual kiritish -->
        <div id="u-section-manual" style="display:${['receptionist','admin'].includes(role)?'flex':'none'};flex-direction:column;gap:var(--sp-3);">
          <div class="form-group">
            <label class="label">👤 To'liq ism *</label>
            <input class="input" id="u-fullname" value="${user?.fullName||''}" placeholder="Ism Familiya" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);">
            <div class="form-group" style="margin:0">
              <label class="label">🔑 Login (username) *</label>
              <input class="input" id="u-username" value="${user?.username||''}" placeholder="kassir1" />
            </div>
            <div class="form-group" style="margin:0">
              <label class="label">🔒 Parol${isEdit ? ' <span style="font-weight:400;color:var(--text-muted)">(bo\'sh = o\'zgarmasih)</span>' : ' *'}</label>
              <input class="input" type="password" id="u-password" placeholder="${isEdit?'O\'zgartirmaslik uchun bo\'sh':'****'}" />
            </div>
          </div>
        </div>

        <!-- VRACH — listdan tanlash -->
        <div id="u-section-doctor" style="display:${role==='doctor'?'flex':'none'};flex-direction:column;gap:var(--sp-3);">
          <div class="form-group">
            <label class="label">👨‍⚕️ Bazadagi vrachlardan tanlang *</label>
            <select class="select" id="u-doctor-id" onchange="AdminSettings._onDoctorSelect(this.value)">
              <option value="">— Vrach tanlang —</option>
              ${doctors.map(d=>`<option value="${d.id}" ${user?.linkedId===d.id?'selected':''}>${d.name}</option>`).join('')}
            </select>
            <div class="hint">Tanlangan vrach bilan bog'lanadi. Unga kunlik hisobot (faqat o'ziniki) Telegram orqali yuboriladi</div>
          </div>
        </div>

        <!-- HAMSHIRA — listdan tanlash -->
        <div id="u-section-nurse" style="display:${role==='nurse'?'flex':'none'};flex-direction:column;gap:var(--sp-3);">
          <div class="form-group">
            <label class="label">👩‍⚕️ Bazadagi hamshiralardan tanlang *</label>
            <select class="select" id="u-nurse-id" onchange="AdminSettings._onNurseSelect(this.value)">
              <option value="">— Hamshira tanlang —</option>
              ${nurses.map(n=>`<option value="${n.id}" ${user?.linkedId===n.id?'selected':''}>${n.name}</option>`).join('')}
            </select>
            <div class="hint">Faqat avans olgan kunlarda tasdiqlash so'rovi yuboriladi</div>
          </div>
        </div>

        <!-- TELEGRAM ID — har bir rol uchun -->
        <div class="form-group">
          <label class="label">✈️ Telegram ID yoki @username</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix" style="font-size:12px;">TG</span>
            <input class="input" id="u-telegram" value="${user?.telegramId||''}" placeholder="@username yoki 123456789" />
          </div>
          <div class="hint">Kun yopilganda bildirishnoma shu adresga yuboriladi. Kelgusida Telegram bot orqali faollashadi.</div>
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="AdminSettings.saveUser('${user?.id||''}')">
          ${Utils.icon('save', 14)} Saqlash
        </button>
      </div>
    `;
  },

  _onRoleChange(role) {
    const show = (id, visible) => {
      const el = document.getElementById(id);
      if (el) el.style.display = visible ? 'flex' : 'none';
    };
    show('u-section-manual', ['receptionist', 'admin'].includes(role));
    show('u-section-doctor', role === 'doctor');
    show('u-section-nurse',  role === 'nurse');
  },

  _onDoctorSelect(docId) {
    // Agar vrach tanlansa — uning ismini ko'rsatish uchun (qo'shimcha UI bo'lsa)
  },

  _onNurseSelect(nurseId) {
    // Agar hamshira tanlansa
  },

  openAddUser() {
    Utils.openModal(this._buildUserModal(null));
  },

  openEditUser(userId) {
    const user = DB.getUsers().find(u => u.id === userId);
    if (!user) return;
    Utils.openModal(this._buildUserModal(user));
  },

  saveUser(existingId) {
    const role       = document.getElementById('u-role')?.value;
    const telegramId = document.getElementById('u-telegram')?.value?.trim() || null;
    let fullName = '', username = '', password = '', linkedId = null;

    if (['receptionist', 'admin'].includes(role)) {
      fullName = document.getElementById('u-fullname')?.value?.trim();
      username = document.getElementById('u-username')?.value?.trim();
      password = document.getElementById('u-password')?.value || '';
      if (!fullName) { Utils.toast('error', 'To\'liq ism kiritilmadi'); return; }
      if (!username) { Utils.toast('error', 'Login (username) kiritilmadi'); return; }
      if (!existingId && !password) { Utils.toast('error', 'Parol kiritish shart'); return; }
    } else if (role === 'doctor') {
      linkedId = document.getElementById('u-doctor-id')?.value;
      if (!linkedId) { Utils.toast('error', 'Vrach tanlanmadi'); return; }
      const doc = DB.getDoctors(this.clinicId).find(d => d.id === linkedId);
      if (!doc) { Utils.toast('error', 'Vrach topilmadi'); return; }
      fullName = doc.name;
    } else if (role === 'nurse') {
      linkedId = document.getElementById('u-nurse-id')?.value;
      if (!linkedId) { Utils.toast('error', 'Hamshira tanlanmadi'); return; }
      const nurse = DB.getNurses(this.clinicId).find(n => n.id === linkedId);
      if (!nurse) { Utils.toast('error', 'Hamshira topilmadi'); return; }
      fullName = nurse.name;
    }

    // Username band tekshiruvi
    if (username) {
      const exists = DB.getUsers().find(u => u.username === username && u.id !== existingId);
      if (exists) { Utils.toast('error', `"${username}" username band`); return; }
    }

    const existingUser = existingId ? DB.getUsers().find(u => u.id === existingId) : null;

    DB.saveUser({
      id:         existingId || DB.generateId('user_'),
      fullName,
      username:   username || '',
      password:   password || existingUser?.password || '',
      role,
      linkedId:   linkedId || null,
      telegramId: telegramId,
      clinicId:   this.clinicId,
      createdAt:  existingUser?.createdAt || new Date().toISOString(),
      updatedAt:  new Date().toISOString()
    });

    Utils.closeModal();
    Utils.toast('success', existingId ? '✅ Yangilandi' : '✅ Foydalanuvchi qo\'shildi');
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  confirmDeleteUser(userId, name) {
    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">🗑️ O'chirishni tasdiqlang</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="padding:var(--sp-2) 0;font-size:var(--text-sm);">
        <strong>"${name}"</strong> foydalanuvchisini o'chirishni tasdiqlaysizmi?
        <div style="margin-top:var(--sp-3);padding:var(--sp-3);background:rgba(239,68,68,0.08);border-radius:var(--r-md);font-size:12px;color:var(--brand-danger);">
          ⚠️ Bu foydalanuvchi tizimdan o'chiriladi. Ammo unga bog'liq vrach/hamshira ma'lumotlari saqlanib qoladi.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-danger" onclick="AdminSettings._doDeleteUser('${userId}')">
          ${Utils.icon('trash', 14)} O'chirish
        </button>
      </div>
    `);
  },

  _doDeleteUser(userId) {
    DB.deleteUser(userId);
    Utils.closeModal();
    Utils.toast('success', 'Foydalanuvchi o\'chirildi');
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  // Legacy compatibility
  editUser(userId) { this.openEditUser(userId); },
  addUser()        { this.openAddUser(); },
  deleteUser(id, name) { this.confirmDeleteUser(id, name); },

  // ================================================================
  // ================================================================
  // 📥 KUNLIK O'ZGARUVCHILAR
  // ================================================================

  renderDailyVars() {
    const vars = DB.getDailyVars(this.clinicId);
    const typeLabels = { currency: "💰 So'm", number: '🔢 Raqam', text: '📝 Matn' };

    return `
      <div class="settings-panel-title">📥 Kunlik kiritish maydonlari</div>

      <div style="display:flex;gap:var(--sp-3);align-items:flex-start;padding:var(--sp-4);background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:var(--r-lg);margin-bottom:var(--sp-5)">
        <div style="font-size:24px;flex-shrink:0">📋</div>
        <div>
          <div style="font-size:var(--text-sm);font-weight:700;margin-bottom:3px">Har klinika o'z maydonlarini belgilaydi</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.6">
            Bu maydonlar <strong>kunlik kiritishda</strong> har bir vrach uchun ko'rinadi.
            Formulada ushbu maydon <strong>ID kodlarini</strong> ishlatish mumkin
            (masalan: <code style="background:rgba(99,102,241,0.1);padding:1px 5px;border-radius:3px">rentgen_soni</code>).
            <strong>Tushum</strong> va <strong>Avans</strong> o'chirib bo'lmaydi.
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--sp-2);margin-bottom:var(--sp-5)" id="daily-vars-list">
        ${vars.map((v, i) => this._renderDailyVarRow(v, i)).join('')}
      </div>

      <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--r-lg);padding:var(--sp-5);margin-bottom:var(--sp-5)">
        <div style="font-size:var(--text-sm);font-weight:700;margin-bottom:var(--sp-4);color:var(--brand-primary)">➕ Yangi maydon qo'shish</div>
        <div style="display:grid;grid-template-columns:56px 1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-3)">
          <div class="form-group" style="margin:0">
            <label class="label">Emoji</label>
            <input class="input" id="new-dv-emoji" value="📌" style="text-align:center;font-size:18px" maxlength="2" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="label">Nom *</label>
            <input class="input" id="new-dv-label" placeholder="Rentgen soni" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="label">ID (kodi) *</label>
            <input class="input" id="new-dv-id" placeholder="rentgen_soni" style="font-family:var(--font-mono)" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-4)">
          <div class="form-group" style="margin:0">
            <label class="label">Turi</label>
            <select class="select" id="new-dv-type">
              <option value="number">🔢 Raqam (soni)</option>
              <option value="currency">💰 So'm (pul)</option>
              <option value="text">📝 Matn</option>
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="label">Birlik (ixtiyoriy)</label>
            <input class="input" id="new-dv-unit" placeholder="ta, dona, sm..." />
          </div>
        </div>
        <button class="btn btn-secondary" onclick="AdminSettings.addDailyVar()">
          ${Utils.icon('plus', 14)} Qo'shish
        </button>
      </div>

      <button class="btn btn-ghost btn-sm" onclick="AdminSettings._resetDailyVarsToDefault()"
        style="color:var(--brand-warning)">
        🔄 Standartga qaytarish
      </button>
    `;
  },

  _renderDailyVarRow(v, i) {
    const typeColors = { currency: 'var(--brand-success)', number: '#22d3ee', text: 'var(--brand-primary)' };
    const typeLabels = { currency: "💰 So'm", number: '🔢 Raqam', text: '📝 Matn' };
    const color = typeColors[v.type] || 'var(--text-muted)';
    return `
      <div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);
        background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--r-lg);
        border-left:3px solid ${v.active ? color : 'var(--border-subtle)'};opacity:${v.active ? 1 : 0.55}">
        <div style="font-size:22px;width:32px;text-align:center;flex-shrink:0">${v.emoji || '📌'}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap">
            <code style="font-size:12px;font-weight:800;color:${color};background:${color}18;padding:2px 8px;border-radius:4px">${v.id}</code>
            <span style="font-size:var(--text-sm);font-weight:600">${v.label}</span>
            <span style="font-size:11px;padding:1px 8px;border-radius:12px;background:${color}18;color:${color}">${typeLabels[v.type] || v.type}</span>
            ${v.required ? '<span style="font-size:10px;color:var(--brand-warning)">⚠️ Majburiy</span>' : ''}
            ${v.unit ? `<span style="font-size:11px;color:var(--text-muted)">${v.unit}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:var(--sp-2);flex-shrink:0;align-items:center">
          ${!v.required ? `
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;color:var(--text-muted);white-space:nowrap">
              <input type="checkbox" ${v.active ? 'checked' : ''}
                onchange="AdminSettings._toggleDailyVar(${i}, this.checked)"
                style="accent-color:var(--brand-primary)"> Faol
            </label>` : ''}
          <button class="btn btn-ghost btn-sm btn-icon" onclick="AdminSettings._editDailyVar(${i})" title="Tahrirlash">
            ${Utils.icon('edit', 14)}
          </button>
          ${!v.required ? `
            <button class="btn btn-danger btn-sm btn-icon" onclick="AdminSettings._deleteDailyVar(${i})" title="O'chirish">
              ${Utils.icon('trash', 14)}
            </button>` : '<div style="width:32px"></div>'}
        </div>
      </div>`;
  },

  addDailyVar() {
    const label = document.getElementById('new-dv-label')?.value?.trim();
    const rawId = document.getElementById('new-dv-id')?.value?.trim();
    const id    = rawId.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const type  = document.getElementById('new-dv-type')?.value || 'number';
    const emoji = document.getElementById('new-dv-emoji')?.value?.trim() || '📌';
    const unit  = document.getElementById('new-dv-unit')?.value?.trim() || '';

    if (!label) { Utils.toast('error', 'Nom kiriting'); return; }
    if (!id)    { Utils.toast('error', 'ID (kodi) kiriting'); return; }

    const vars = DB.getDailyVars(this.clinicId);
    if (vars.find(v => v.id === id)) { Utils.toast('error', `"${id}" ID allaqachon mavjud`); return; }

    vars.push({ id, label, type, emoji, unit, required: false, active: true });
    DB.saveDailyVars(this.clinicId, vars);
    Utils.toast('success', `✅ "${label}" maydon qo'shildi`);
    this.activeTab = 'daily_vars';
    document.getElementById('settings-panel').innerHTML = this.renderPanel();

    // Formula builder uchun ham hint yangilash
    setTimeout(() => {
      const hint = document.getElementById('daily-vars-hint');
      if (hint) hint.innerHTML = this._buildVarsHint();
    }, 100);
  },

  _toggleDailyVar(idx, active) {
    const vars = DB.getDailyVars(this.clinicId);
    if (vars[idx]) {
      vars[idx].active = active;
      DB.saveDailyVars(this.clinicId, vars);
    }
  },

  _deleteDailyVar(idx) {
    const vars = DB.getDailyVars(this.clinicId);
    if (vars[idx]?.required) { Utils.toast('error', "Majburiy maydonni o'chirib bo'lmaydi"); return; }
    if (!confirm(`"${vars[idx]?.label}" maydonini o'chirasizmi?`)) return;
    vars.splice(idx, 1);
    DB.saveDailyVars(this.clinicId, vars);
    this.activeTab = 'daily_vars';
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  _editDailyVar(idx) {
    const vars = DB.getDailyVars(this.clinicId);
    const v = vars[idx];
    if (!v) return;
    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">✏️ Maydonni tahrirlash</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
        <div style="display:grid;grid-template-columns:56px 1fr;gap:var(--sp-3)">
          <div class="form-group" style="margin:0">
            <label class="label">Emoji</label>
            <input class="input" id="edit-dv-emoji" value="${v.emoji || '📌'}" style="text-align:center;font-size:18px" maxlength="2" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="label">Nom *</label>
            <input class="input" id="edit-dv-label" value="${v.label}" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
          <div class="form-group" style="margin:0">
            <label class="label">ID${v.required ? ' — o\'zgarmas' : ''}</label>
            <input class="input" id="edit-dv-id" value="${v.id}" ${v.required ? 'readonly style="opacity:0.6;font-family:var(--font-mono)"' : 'style="font-family:var(--font-mono)"'} />
          </div>
          <div class="form-group" style="margin:0">
            <label class="label">Turi${v.required ? ' — o\'zgarmas' : ''}</label>
            <select class="select" id="edit-dv-type" ${v.required ? 'disabled' : ''}>
              <option value="number"   ${v.type==='number'  ?'selected':''}>🔢 Raqam</option>
              <option value="currency" ${v.type==='currency'?'selected':''}>💰 So'm</option>
              <option value="text"     ${v.type==='text'    ?'selected':''}>📝 Matn</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label class="label">Birlik (ixtiyoriy)</label>
          <input class="input" id="edit-dv-unit" value="${v.unit || ''}" placeholder="ta, dona, sm..." />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="AdminSettings._saveEditDailyVar(${idx})">${Utils.icon('save',14)} Saqlash</button>
      </div>
    `);
  },

  _saveEditDailyVar(idx) {
    const vars = DB.getDailyVars(this.clinicId);
    const v = vars[idx];
    if (!v) return;
    const newLabel = document.getElementById('edit-dv-label')?.value?.trim();
    const newEmoji = document.getElementById('edit-dv-emoji')?.value?.trim() || '📌';
    const newUnit  = document.getElementById('edit-dv-unit')?.value?.trim() || '';
    const newId    = v.required ? v.id : (document.getElementById('edit-dv-id')?.value?.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') || v.id);
    const newType  = v.required ? v.type : (document.getElementById('edit-dv-type')?.value || v.type);
    if (!newLabel) { Utils.toast('error', "Nom bo'sh bo'lmasin"); return; }
    vars[idx] = { ...v, label: newLabel, emoji: newEmoji, unit: newUnit, id: newId, type: newType };
    DB.saveDailyVars(this.clinicId, vars);
    Utils.closeModal();
    Utils.toast('success', 'Yangilandi');
    this.activeTab = 'daily_vars';
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  _resetDailyVarsToDefault() {
    if (!confirm("Standart maydonlarga qaytarasizmi? (tushum, texnik, implant, avans)")) return;
    DB.saveDailyVars(this.clinicId, JSON.parse(JSON.stringify(DB.DEFAULT_DAILY_VARS)));
    Utils.toast('success', 'Standartga qaytarildi');
    this.activeTab = 'daily_vars';
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
  },

  // ================================================================
  // 💡 MAOSH FORMULASI BUILDER
  // ================================================================

  renderFormulaBuilder() {
    const steps    = FormulaEngine.getSteps(this.clinicId);
    const baseVars = FormulaEngine.getAvailableVars(this.clinicId);
    const dailyVars = DB.getDailyVars(this.clinicId).filter(v => v.active);

    const typeColors = { sum: '#22d3ee', formula: 'var(--brand-primary)', result: 'var(--brand-success)' };

    return `
      <div class="settings-panel-title">💡 Maosh formulasi qadamlari</div>

      <!-- CHOP ETISHDA HAM ISHLAYDI bannersi -->
      <div style="display:flex;gap:var(--sp-3);align-items:center;padding:var(--sp-3) var(--sp-4);
        background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.25);border-radius:var(--r-lg);margin-bottom:var(--sp-5)">
        <div style="font-size:20px">🖨️</div>
        <div style="font-size:12px;color:var(--text-muted)">
          Bu yerda yozilgan formulalar <strong style="color:var(--brand-success)">oylik hisobotda ekranda</strong> va
          <strong style="color:var(--brand-success)">chop etishda ham</strong> to'g'ri hisob-kitob bilan ko'rinadi.
          Har bir qadam — avvalgi qadamning natijasini o'zgaruvchi sifatida ishlatishi mumkin.
        </div>
      </div>

      <!-- QADAMLAR RO'YXATI — INLINE EDIT -->
      <div style="margin-bottom:var(--sp-5)">
        ${steps.length ? steps.map((step, i) => {
          const color = typeColors[step.type] || 'var(--brand-primary)';
          const prevIds = steps.slice(0, i).map(p =>
            `<code style="background:${typeColors[p.type]||'var(--brand-primary)'}18;color:${typeColors[p.type]||'var(--brand-primary)'};padding:1px 5px;border-radius:3px;font-size:11px">${p.id}</code>`
          ).join(' ');
          return `
            <div style="margin-bottom:var(--sp-3);border:1px solid var(--border-subtle);border-left:4px solid ${color};border-radius:var(--r-lg);background:var(--bg-elevated);overflow:hidden">
              <!-- Sarlavha -->
              <div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);border-bottom:1px solid var(--border-subtle)">
                <span style="font-size:20px">${step.emoji||'📌'}</span>
                <code style="font-size:var(--text-md);font-weight:900;color:${color};background:${color}18;padding:3px 10px;border-radius:5px;letter-spacing:0.04em">${step.id}</code>
                <span style="font-weight:600;font-size:var(--text-sm)">${step.label}</span>
                <span style="font-size:11px;padding:2px 10px;border-radius:12px;background:${color}18;color:${color};margin-left:auto">
                  ${{sum:'📊 Jami', formula:'🧮 Formula', result:'💚 Natija'}[step.type]||step.type}
                </span>
                <div style="display:flex;gap:4px">
                  ${i>0?`<button class="btn btn-ghost btn-sm btn-icon" onclick="AdminSettings._moveStep(${i},-1)">↑</button>`:'<div style="width:32px"></div>'}
                  ${i<steps.length-1?`<button class="btn btn-ghost btn-sm btn-icon" onclick="AdminSettings._moveStep(${i},1)">↓</button>`:'<div style="width:32px"></div>'}
                  <button class="btn btn-danger btn-sm btn-icon" onclick="AdminSettings._deleteStep(${i})">${Utils.icon('trash',14)}</button>
                </div>
              </div>
              <!-- Formula input — inline -->
              <div style="padding:var(--sp-4)">
                <div style="display:grid;grid-template-columns:1fr 140px;gap:var(--sp-3);margin-bottom:var(--sp-3)">
                  <div>
                    <label class="label" style="font-size:11px;color:${color}">Formula</label>
                    <input class="input" id="step-expr-${i}"
                      value="${step.expr}"
                      style="font-family:var(--font-mono);font-size:var(--text-md);border-color:${color}44"
                      oninput="AdminSettings._inlineSave(${i})" />
                  </div>
                  <div>
                    <label class="label" style="font-size:11px">Turi</label>
                    <select class="select" id="step-type-${i}" onchange="AdminSettings._inlineSave(${i})">
                      <option value="formula" ${step.type==='formula'?'selected':''}>🧮 Formula</option>
                      <option value="sum"     ${step.type==='sum'    ?'selected':''}>📊 Jami</option>
                      <option value="result"  ${step.type==='result' ?'selected':''}>💚 Natija</option>
                    </select>
                  </div>
                </div>
                <!-- Test natija -->
                <div id="step-live-${i}" style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)"></div>
                ${i > 0 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:var(--sp-2)">
                  Oldingi qadamlar: ${prevIds}
                </div>` : ''}
              </div>
            </div>`;
        }).join('') : `
          <div style="text-align:center;padding:var(--sp-8);color:var(--text-muted);border:2px dashed var(--border-subtle);border-radius:var(--r-lg)">
            <div style="font-size:40px;margin-bottom:var(--sp-3)">📋</div>
            <div>Qadam yo'q — qo'shish uchun pastdagi tugmani bosing</div>
            <div style="margin-top:var(--sp-3)">yoki <strong>Standartga qaytarish</strong> tugmasi orqali JTS, JIS, VU, JVB ni yuklang</div>
          </div>`}
      </div>

      <!-- O'ZGARUVCHILAR YORDAM -->
      <div style="padding:var(--sp-3) var(--sp-4);background:var(--bg-secondary);border-radius:var(--r-lg);margin-bottom:var(--sp-5);font-size:11px;line-height:2">
        <div style="font-weight:700;margin-bottom:4px;color:var(--text-secondary)">📋 Formulada ishlatish mumkin bo'lgan o'zgaruvchilar:</div>
        ${dailyVars.map(v =>
          `<code style="background:rgba(99,102,241,0.12);padding:1px 7px;border-radius:4px;color:var(--brand-primary);margin-right:3px">${v.id}</code>${v.label}`
        ).join(' &nbsp;·&nbsp; ')}
        &nbsp;·&nbsp;
        <code style="background:rgba(99,102,241,0.12);padding:1px 7px;border-radius:4px;color:var(--brand-primary)">percent</code>Foiz&nbsp;·&nbsp;
        <code style="background:rgba(99,102,241,0.12);padding:1px 7px;border-radius:4px;color:var(--brand-primary)">implantValue</code>Im.narxi
        ${steps.length ? '<br><span style="color:var(--text-muted)">Qadam natijalari:</span> ' + steps.map(s =>
          `<code style="background:rgba(16,185,129,0.12);padding:1px 7px;border-radius:4px;color:var(--brand-success)">${s.id}</code>${s.label}`
        ).join(' &nbsp;·&nbsp; ') : ''}
      </div>

      <!-- YANGI QADAM QO'SHISH -->
      <div style="background:var(--bg-elevated);border:1px dashed var(--border-subtle);border-radius:var(--r-lg);padding:var(--sp-5);margin-bottom:var(--sp-5)">
        <div style="font-size:var(--text-sm);font-weight:700;margin-bottom:var(--sp-4);color:var(--brand-primary)">➕ Yangi qadam qo'shish</div>
        <div style="display:grid;grid-template-columns:60px 1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-3)">
          <div class="form-group" style="margin:0">
            <label class="label" style="font-size:11px">Emoji</label>
            <input class="input" id="new-step-emoji" value="📊" style="text-align:center;font-size:18px" maxlength="2" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="label" style="font-size:11px">ID (kodi) *</label>
            <input class="input" id="new-step-id" placeholder="JTS, JIS, VU..." style="font-family:var(--font-mono);font-weight:700;text-transform:uppercase" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="label" style="font-size:11px">Nom *</label>
            <input class="input" id="new-step-label" placeholder="Jami Texnik Summasi" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 140px;gap:var(--sp-3);margin-bottom:var(--sp-3)">
          <div class="form-group" style="margin:0">
            <label class="label" style="font-size:11px">Formula *</label>
            <input class="input" id="new-step-expr" placeholder="tushum * percent / 100"
              style="font-family:var(--font-mono)" oninput="AdminSettings._previewStep()" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="label" style="font-size:11px">Turi</label>
            <select class="select" id="new-step-type">
              <option value="formula">🧮 Formula</option>
              <option value="sum">📊 Jami</option>
              <option value="result">💚 Natija</option>
            </select>
          </div>
        </div>
        <div id="step-preview" style="margin-bottom:var(--sp-3);padding:var(--sp-2) var(--sp-3);background:rgba(99,102,241,0.06);border-radius:var(--r-md);font-size:12px;display:none"></div>
        <button class="btn btn-secondary" onclick="AdminSettings.addFormulaStep()">
          ${Utils.icon('plus', 14)} Qadam qo'shish
        </button>
      </div>

      <!-- JONLI TEST -->
      <div style="background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.2);border-radius:var(--r-lg);padding:var(--sp-4);margin-bottom:var(--sp-5)">
        <div style="font-size:var(--text-sm);font-weight:700;color:var(--brand-primary);margin-bottom:var(--sp-3)">🔬 Jonli test</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--sp-3);margin-bottom:var(--sp-4)">
          ${dailyVars.filter(v => v.type !== 'text').map(v => `
            <div class="form-group" style="margin:0">
              <label class="label" style="font-size:11px">${v.emoji||''} ${v.label}</label>
              <input class="input" type="number" id="test-${v.id}"
                value="${v.id==='tushum'?'10000000':v.id==='avans'?'500000':v.id==='texnik'?'3000000':v.id==='implantCount'?'2':v.id==='implantValue'?'300000':'0'}"
                oninput="AdminSettings._runTest()" />
            </div>`).join('')}
          <div class="form-group" style="margin:0">
            <label class="label" style="font-size:11px">Foiz (%)</label>
            <input class="input" type="number" id="test-percent" value="35" oninput="AdminSettings._runTest()" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="label" style="font-size:11px">Implant narxi</label>
            <input class="input" type="number" id="test-implantValue" value="300000" oninput="AdminSettings._runTest()" />
          </div>
        </div>
        <div id="test-result-table"></div>
      </div>

      <div style="display:flex;gap:var(--sp-3)">
        <button class="btn btn-primary" onclick="AdminSettings.saveFormulaSteps()">
          ${Utils.icon('save', 14)} Saqlash
        </button>
        <button class="btn btn-secondary" onclick="AdminSettings._resetFormulaToDefault()"
          style="color:var(--brand-warning);border-color:rgba(245,158,11,0.4)">
          🔄 JTS/JIS/VU/JVB standartga qaytarish
        </button>
      </div>
    `;
  },

  // Inline formula o'zgarganda avtomatik saqlash + jonli test
  _inlineSave(idx) {
    const expr  = document.getElementById(`step-expr-${idx}`)?.value?.trim();
    const type  = document.getElementById(`step-type-${idx}`)?.value || 'formula';
    if (!expr) return;

    const steps = FormulaEngine.getSteps(this.clinicId).slice();
    if (!steps[idx]) return;
    steps[idx] = { ...steps[idx], expr, type };
    FormulaEngine.saveSteps(this.clinicId, steps);

    // Jonli test natijasini shu qadamga ko'rsatish
    this._runTest();
    const liveEl = document.getElementById(`step-live-${idx}`);
    if (liveEl) {
      const testVars = this._getTestVars();
      const test = FormulaEngine.testFormula(expr, testVars);
      liveEl.innerHTML = test.ok
        ? `✅ = <strong style="color:var(--brand-success)">${Utils.formatMoneyShort(test.result)}</strong>`
        : `❌ <span style="color:var(--brand-danger)">${test.error}</span>`;
    }
  },

  _getTestVars() {
    const dailyVars = DB.getDailyVars(this.clinicId).filter(v => v.active && v.type !== 'text');
    const vars = {};
    dailyVars.forEach(v => {
      const el = document.getElementById(`test-${v.id}`);
      vars[v.id] = el ? Utils.num(el.value) : 0;
    });
    const pEl = document.getElementById('test-percent');
    const iEl = document.getElementById('test-implantValue');
    vars.percent      = pEl ? Utils.num(pEl.value) : 35;
    vars.implantValue = iEl ? Utils.num(iEl.value) : 300000;
    return vars;
  },

  addFormulaStep() {
    const id    = document.getElementById('new-step-id')?.value?.trim().toUpperCase().replace(/\s/g,'');
    const label = document.getElementById('new-step-label')?.value?.trim();
    const expr  = document.getElementById('new-step-expr')?.value?.trim();
    const type  = document.getElementById('new-step-type')?.value || 'formula';
    const emoji = document.getElementById('new-step-emoji')?.value?.trim() || '📌';

    if (!id)    { Utils.toast('error', 'ID (kodi) kiriting'); return; }
    if (!label) { Utils.toast('error', 'Nom kiriting'); return; }
    if (!expr)  { Utils.toast('error', 'Formula kiriting'); return; }

    const test = FormulaEngine.testFormula(expr, this._getTestVars() || { tushum: 1000000, percent: 35 });
    if (!test.ok) { Utils.toast('error', `Formula xato: ${test.error}`); return; }

    const steps = FormulaEngine.getSteps(this.clinicId).slice();
    const existIdx = steps.findIndex(s => s.id === id);
    const newStep  = { id, label, expr, type, emoji };
    if (existIdx >= 0) steps[existIdx] = newStep;
    else steps.push(newStep);

    FormulaEngine.saveSteps(this.clinicId, steps);
    Utils.toast('success', `✅ "${id}" qadami saqlandi`);
    this.activeTab = 'formula_builder';
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
    setTimeout(() => this._runTest(), 100);
  },

  saveFormulaSteps() {
    const steps = FormulaEngine.getSteps(this.clinicId);
    FormulaEngine.saveSteps(this.clinicId, steps);
    Utils.toast('success', '✅ Formulalar saqlandi');
  },

  _deleteStep(idx) {
    if (!confirm('Bu qadamni o\'chirasizmi?')) return;
    const steps = FormulaEngine.getSteps(this.clinicId).slice();
    steps.splice(idx, 1);
    FormulaEngine.saveSteps(this.clinicId, steps);
    this.activeTab = 'formula_builder';
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
    setTimeout(() => this._runTest(), 100);
  },

  _moveStep(idx, dir) {
    const steps = FormulaEngine.getSteps(this.clinicId).slice();
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
    FormulaEngine.saveSteps(this.clinicId, steps);
    this.activeTab = 'formula_builder';
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
    setTimeout(() => this._runTest(), 100);
  },

  _previewStep() {
    const expr = document.getElementById('new-step-expr')?.value?.trim();
    const prev = document.getElementById('step-preview');
    if (!prev) return;
    if (!expr) { prev.style.display = 'none'; return; }
    const test = FormulaEngine.testFormula(expr, this._getTestVars() || { tushum: 2400000, percent: 35 });
    prev.style.display = '';
    prev.innerHTML = test.ok
      ? `✅ Natija: <strong style="color:var(--brand-success)">${Utils.formatMoneyShort(test.result)} so'm</strong>`
      : `❌ Xato: <span style="color:var(--brand-danger)">${test.error}</span>`;
  },

  _runTest() {
    const tbl = document.getElementById('test-result-table');
    if (!tbl) return;

    const testVars = this._getTestVars();
    const stepResults = FormulaEngine.calcSteps(this.clinicId, {
      ...testVars,
      doctor: { percent: testVars.percent, implantValue: testVars.implantValue }
    });

    if (!stepResults.length) {
      tbl.innerHTML = '<div style="color:var(--text-muted);font-size:var(--text-sm)">Qadam yo\'q — avval qo\'shing</div>';
      return;
    }

    const typeColors = { sum: '#22d3ee', formula: 'var(--brand-primary)', result: 'var(--brand-success)' };
    tbl.innerHTML = `
      <div style="overflow-x:auto">
        <table class="table" style="font-size:13px">
          <thead><tr><th>ID</th><th>Nom</th><th>Hisob</th><th class="right">Natija</th></tr></thead>
          <tbody>
            ${stepResults.map(s => `
              <tr style="${s.type==='result'?'background:rgba(16,185,129,0.07);font-weight:700':''}">
                <td><code style="color:${typeColors[s.type]||'var(--brand-primary)'};font-weight:800;font-size:var(--text-sm)">${s.emoji||''} ${s.id}</code></td>
                <td style="font-size:12px">${s.label}</td>
                <td style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);max-width:220px;overflow:hidden;text-overflow:ellipsis">${s.exprText}</td>
                <td class="right mono" style="color:${typeColors[s.type]||'var(--text-primary)'};font-size:var(--text-md)">
                  ${Utils.formatMoneyShort(s.value)}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    // Har bir qadam uchun live ko'rsatkich yangilash
    stepResults.forEach((s, i) => {
      const el = document.getElementById(`step-live-${i}`);
      if (el) el.innerHTML = `= <strong style="color:${typeColors[s.type]||'var(--brand-primary)'}">${Utils.formatMoneyShort(s.value)}</strong>`;
    });
  },

  _resetFormulaToDefault() {
    FormulaEngine.saveSteps(this.clinicId, FormulaEngine.DEFAULT_STEPS);
    Utils.toast('success', 'Standartga qaytarildi');
    document.getElementById('settings-panel').innerHTML = this.renderPanel();
    setTimeout(() => this._runTest(), 100);
  }
};
