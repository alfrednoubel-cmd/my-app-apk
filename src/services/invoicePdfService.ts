// ==============================================================================
// SERVICE DE GÉNÉRATION DE FACTURES & AVOIRS PDF (CONFORME CGI & VTC)
// Conforme à l'Art. 242 nonies A de l'annexe II au CGI,
// Franchise en base de TVA (Art. 293 B du CGI) et mentions B2B obligatoires
// ==============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, InvoiceItem, Client, Profile } from '../types/models';
import { LEGAL_CONSTANTS } from '../constants/legal';

export const invoicePdfService = {
  /**
   * Génère le template HTML haute fidélité pour une Facture ou un Avoir
   */
  generateInvoiceHtml(
    invoice: Invoice,
    profile: Profile,
    client: Client,
    items: InvoiceItem[]
  ): string {
    const isCreditNote = invoice.is_credit_note;
    const docTitle = isCreditNote
      ? LEGAL_CONSTANTS.VTC_CREDIT_NOTE_TITLE
      : LEGAL_CONSTANTS.VTC_INVOICE_TITLE;
    const docColor = isCreditNote ? '#dc2626' : '#2563eb';

    const eiMention = profile.is_ei ? ' EI' : '';
    const driverFullName = `${profile.first_name} ${profile.last_name}${eiMention}`;
    const commercialName = profile.commercial_name ? ` (${profile.commercial_name})` : '';

    const invoiceDateFormatted = new Date(invoice.invoice_date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const dueDateFormatted = new Date(invoice.due_date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const isEnterprise = client.type === 'entreprise';
    const clientName = isEnterprise
      ? client.company_name
      : `${client.last_name} ${client.first_name || ''}`;

    // Lignes de facture
    const itemsRowsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">
            ${item.description}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            ${Number(item.quantity).toFixed(0)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
            ${Number(item.unit_price).toFixed(2)} €
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">
            ${Number(item.total_price).toFixed(2)} €
          </td>
        </tr>
      `
      )
      .join('');

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>${docTitle} ${invoice.invoice_number}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 32px;
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid ${docColor};
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .company-name {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .company-sub {
          color: #64748b;
          font-size: 12px;
          line-height: 1.4;
        }
        .doc-meta {
          text-align: right;
        }
        .doc-type {
          font-size: 22px;
          font-weight: 800;
          color: ${docColor};
          text-transform: uppercase;
          margin-bottom: 4px;
          letter-spacing: -0.5px;
        }
        .doc-number {
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
        }
        .doc-date {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        .parties {
          display: flex;
          gap: 24px;
          margin-bottom: 28px;
        }
        .party-card {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px 16px;
        }
        .party-title {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .party-name {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .party-detail {
          color: #475569;
          font-size: 12px;
          line-height: 1.4;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .table th {
          background: #f1f5f9;
          color: #475569;
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 700;
          padding: 10px 12px;
          border-top: 1px solid #e2e8f0;
          border-bottom: 2px solid #cbd5e1;
        }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .totals-box {
          width: 280px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 13px;
        }
        .totals-row.grand-total {
          border-top: 2px solid #cbd5e1;
          margin-top: 8px;
          padding-top: 8px;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .tva-exemption {
          background: #eff6ff;
          border-left: 4px solid #2563eb;
          padding: 10px 14px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 20px;
        }
        .bank-details {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 12px;
        }
        .bank-title {
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .footer-legal {
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
          font-size: 10px;
          color: #64748b;
          line-height: 1.4;
          text-align: justify;
        }
      </style>
    </head>
    <body>
      <!-- EN-TÊTE -->
      <div class="header">
        <div>
          <div class="company-name">${driverFullName}${commercialName}</div>
          <div class="company-sub">
            Exploitant VTC • N° REVTC : <strong>${profile.revtc_number}</strong><br />
            SIRET : ${profile.siret} • SIREN : ${profile.siren}<br />
            ${profile.address}, ${profile.postal_code} ${profile.city}<br />
            Tél : ${profile.phone} • E-mail : ${profile.email}
          </div>
        </div>

        <div class="doc-meta">
          <div class="doc-type">${docTitle}</div>
          <div class="doc-number">N° ${invoice.invoice_number}</div>
          <div class="doc-date">Date : ${invoiceDateFormatted}</div>
          <div class="doc-date">Échéance : <strong>${dueDateFormatted}</strong></div>
        </div>
      </div>

      <!-- PARTIES PRENANTES -->
      <div class="parties">
        <div class="party-card">
          <div class="party-title">Émetteur</div>
          <div class="party-name">${driverFullName}</div>
          <div class="party-detail">
            Statut : Entrepreneur Individuel (EI)<br />
            Régime TVA : Franchise en base<br />
            Inscription REVTC valide
          </div>
        </div>

        <div class="party-card">
          <div class="party-title">Facturé à (Client)</div>
          <div class="party-name">${clientName}</div>
          <div class="party-detail">
            ${client.contact_name ? `Contact : ${client.contact_name}<br />` : ''}
            ${client.siren_siret ? `SIREN/SIRET : ${client.siren_siret}<br />` : ''}
            ${client.billing_address ? `Adresse : ${client.billing_address}<br />` : ''}
            Tél : ${client.phone}
            ${client.email ? `• E-mail : ${client.email}` : ''}
          </div>
        </div>
      </div>

      <!-- TABLEAU DES PRESTATIONS -->
      <table class="table">
        <thead>
          <tr>
            <th style="text-align: left; width: 55%;">Désignation de la prestation</th>
            <th style="text-align: center; width: 15%;">Quantité</th>
            <th style="text-align: right; width: 15%;">Prix Unitaire</th>
            <th style="text-align: right; width: 15%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>

      <!-- RÉCAPITULATIF FINANCIER -->
      <div class="totals-section">
        <div class="totals-box">
          <div class="totals-row">
            <span>Total net (HT) :</span>
            <span style="font-weight: 600;">${Number(invoice.total_ht).toFixed(2)} €</span>
          </div>
          <div class="totals-row">
            <span>Taux de TVA :</span>
            <span>0,00 %</span>
          </div>
          <div class="totals-row">
            <span>Montant de la TVA :</span>
            <span>0,00 €</span>
          </div>
          <div class="totals-row grand-total">
            <span>NET À PAYER :</span>
            <span>${Number(invoice.total_ttc).toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <!-- MENTION LÉGALE FRANCHISE DE TVA (OBLIGATOIRE ART. 293 B DU CGI) -->
      <div class="tva-exemption">
        ⚖️ <strong>Régime fiscal :</strong> ${profile.tva_mention}
      </div>

      <!-- COORDONNÉES BANCAIRES POUR VIREMENT -->
      ${
        profile.rib_iban
          ? `
      <div class="bank-details">
        <div class="bank-title">Coordonnées de règlement par virement bancaire :</div>
        IBAN : <strong>${profile.rib_iban}</strong> • BIC/SWIFT : <strong>${profile.rib_bic || 'N/A'}</strong><br />
        Titulaire : ${driverFullName} • Banque : ${profile.bank_name || 'Établissement bancaire'}
      </div>`
          : ''
      }

      <!-- MENTIONS LÉGALES PROFESSIONNELLES & PÉNALITÉS B2B -->
      <div class="footer-legal">
        <strong>Conditions de règlement :</strong> ${invoice.payment_terms || profile.payment_terms}.
        ${
          isEnterprise
            ? `<br /><strong>Mentions obligatoires entre professionnels :</strong> En application de l'article L. 441-10 et D. 441-5 du Code de commerce, tout retard de paiement entraînera de plein droit des pénalités d'un montant équivalent au taux d'intérêt de la Banque centrale européenne majoré de 10 points de pourcentage, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €.`
            : ''
        }
        <br />Facture établie en conformité avec la réglementation française. Dispensé d'immatriculation au RCS en application de l'article L. 123-1-1 du Code de commerce.
      </div>
    </body>
    </html>
    `;
  },

  /**
   * Crée le fichier PDF local via expo-print
   */
  async createInvoicePdfFile(
    invoice: Invoice,
    profile: Profile,
    client: Client,
    items: InvoiceItem[]
  ): Promise<string> {
    const html = this.generateInvoiceHtml(invoice, profile, client, items);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    return uri;
  },

  /**
   * Ouvre la prévisualisation plein écran / impression de la facture PDF
   */
  async previewInvoicePdf(
    invoice: Invoice,
    profile: Profile,
    client: Client,
    items: InvoiceItem[]
  ): Promise<void> {
    const html = this.generateInvoiceHtml(invoice, profile, client, items);
    await Print.printAsync({ html });
  },

  /**
   * Partage direct du PDF de facture
   */
  async shareInvoicePdf(pdfUri: string, invoiceNumber: string): Promise<void> {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Partager la facture ${invoiceNumber}`,
        UTI: 'com.adobe.pdf',
      });
    }
  },
};
