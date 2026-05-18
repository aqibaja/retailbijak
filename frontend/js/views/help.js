import { observeElements } from '../main.js?v=20260518K';
import { t as _t } from '../i18n.js?v=20260518K';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

export function renderHelp(root) {
    document.title = `RetailBijak — ${t('help_view.title')}`;
    root.innerHTML = `
      <section class="help-page-pro stagger-reveal">
        <div class="help-hero">
          <div class="help-hero-copy">
            <div class="help-meta-pill">${t('help_view.meta_pill')}</div>
            <h1>${t('help_view.heading')}</h1>
            <p>${t('help_view.description')}</p>
          </div>
          <div class="help-hero-side">
            <div class="help-side-label">${t('help_view.quick_start_label')}</div>
            <div class="help-side-value">${t('help_view.quick_start_value')}</div>
          </div>
        </div>

        <div class="help-layout">
          <div class="help-guide-panel panel flex-col gap-6">
            <div class="help-guide-head">
              <h2 class="help-section-title">${t('help_view.quick_start_section')}</h2>
              <a href="#settings" class="btn btn-secondary help-inline-link">${t('help_view.open_settings_button')}</a>
            </div>
            <div class="help-guide-grid">
                <div class="help-step-card">
                    <div class="help-step-index"><i data-lucide="search" class="help-step-icon"></i>01</div>
                    <div>
                        <h3>${t('help_view.step_1_title')}</h3>
                        <p>${t('help_view.step_1_desc')}</p>
                    </div>
                </div>
                <div class="help-step-card">
                    <div class="help-step-index"><i data-lucide="bar-chart-3" class="help-step-icon"></i>02</div>
                    <div>
                        <h3>${t('help_view.step_2_title')}</h3>
                        <p>${t('help_view.step_2_desc')}</p>
                    </div>
                </div>
                <div class="help-step-card">
                    <div class="help-step-index"><i data-lucide="bookmark" class="help-step-icon"></i>03</div>
                    <div>
                        <h3>${t('help_view.step_3_title')}</h3>
                        <p>${t('help_view.step_3_desc')}</p>
                    </div>
                </div>
            </div>

            <div class="help-guide-head mt-16">
              <h2 class="help-section-title">${t('help_view.keyboard_shortcuts_section')}</h2>
            </div>
            <div class="help-shortcuts-grid">
                <div class="help-shortcut-card">
                    <kbd>/</kbd>
                    <span>${t('help_view.shortcut_slash')}</span>
                </div>
                <div class="help-shortcut-card">
                    <kbd>Ctrl+K</kbd>
                    <span>${t('help_view.shortcut_ctrl_k')}</span>
                </div>
                <div class="help-shortcut-card">
                    <kbd>Esc</kbd>
                    <span>${t('help_view.shortcut_esc')}</span>
                </div>
                <div class="help-shortcut-card">
                    <kbd>↑↓</kbd>
                    <span>${t('help_view.shortcut_arrows')}</span>
                </div>
                <div class="help-shortcut-card">
                    <kbd>Enter</kbd>
                    <span>${t('help_view.shortcut_enter')}</span>
                </div>
            </div>

            <div class="help-guide-head mt-16">
              <h2 class="help-section-title">${t('help_view.faq_section')}</h2>
            </div>
            <div class="help-faq-stack">
                <details class="help-faq-item">
                    <summary>${t('help_view.faq_1_q')}</summary>
                    <p>${t('help_view.faq_1_a')}</p>
                </details>
                <details class="help-faq-item">
                    <summary>${t('help_view.faq_2_q')}</summary>
                    <p>${t('help_view.faq_2_a')}</p>
                </details>
                <details class="help-faq-item">
                    <summary>${t('help_view.faq_3_q')}</summary>
                    <p>${t('help_view.faq_3_a')}</p>
                </details>
                <details class="help-faq-item">
                    <summary>${t('help_view.faq_4_q')}</summary>
                    <p>${t('help_view.faq_4_a')}</p>
                </details>
                <details class="help-faq-item">
                    <summary>${t('help_view.faq_5_q')}</summary>
                    <p>${t('help_view.faq_5_a')}</p>
                </details>
                <details class="help-faq-item">
                    <summary>${t('help_view.faq_6_q')}</summary>
                    <p>${t('help_view.faq_6_a')}</p>
                </details>
            </div>
          </div>

          <div class="help-support-panel panel flex-col justify-center items-center text-center">
            <div class="help-support-icon">
                <i data-lucide="life-buoy" class="lucide-xl"></i>
            </div>
            <h3>${t('help_view.support_heading')}</h3>
            <p>${t('help_view.support_desc')}</p>
            <div class="flex gap-3 help-cta-fix">
              <a href="#screener" class="btn btn-primary help-support-btn">${t('help_view.open_screener_button')}</a>
              <a href="#portfolio" class="btn btn-secondary help-support-btn">${t('help_view.manage_assets_button')}</a>
            </div>
          </div>
        </div>
      </section>
    `;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
