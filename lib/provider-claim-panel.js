'use strict';

function renderClaimPanelShell() {
  return (
    '<section id="provider-claim-panel" class="provider-claim-panel" aria-label="Claim this listing">' +
    '<p class="provider-claim-panel__loading body-text">Loading claim options…</p>' +
    '</section>'
  );
}

module.exports = { renderClaimPanelShell };
