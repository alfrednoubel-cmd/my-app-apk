// ==============================================================================
// SERVICE D'EXPORT DU LIVRE DES RECETTES (CSV & PDF OFFICIEL)
// Conforme à l'Article L. 123-28 du Code de Commerce et Art. 286 du CGI
// ==============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ReceiptBookEntry, Profile } from '../types/models';

export const receiptBookExportService = {
  /**
   * Génère le fichier CSV (séparateur point-virgule compatible Excel France)
   */
  generateCsv(entries: ReceiptBookEntry[], profile: Profile, periodLabel: string): string {
    const header = [
      'N° Ordre',
      'Date Encaissement',
      'N° Facture',
      'Nom du Client',
      'Nature de la Prestation',
      'Mode de Règlement',
      'Montant Encaissé (€)',
    ].join(';');

    const rows = entries.map((e) => {
      const dateFormatted = new Date(e.entry_date).toLocaleDateString('fr-FR');
      const cleanClient = `"${(e.client_name || '').replace(/"/g, '""')}"`;
      const cleanNature = `"${(e.service_nature || '').replace(/"/g, '""')}"`;
      const cleanMethod = e.payment_method.toUpperCase();
      const amountFormatted = Number(e.amount).toFixed(2).replace('.', ',');

      return [
        e.entry_number,
        dateFormatted,
        e.invoice_number,
        cleanClient,
        cleanNature,
        cleanMethod,
        amountFormatted,
      ].join(';');
    });

    const totalAmount = entries
      .reduce((sum, e) => sum + Number(e.amount), 0)
      .toFixed(2)
      .replace('.', ',');

    const totalRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      totalAmount,
    ].join(';');

    return `LIVRE DES RECETTES - ${profile.first_name} ${profile.last_name} (${profile.siret}) - Période: ${periodLabel}\n\n${header}\n${rows.join('\n')}\n${totalRow}\n`;
  },

  /**
   * Partage le fichier CSV exporté
   */
  async exportAndShareCsv(
    entries: ReceiptBookEntry[],
    profile: Profile,
    periodLabel: string
  ): Promise<void> {
    const csvContent = this.generateCsv(entries, profile, periodLabel);
    const fileName = `livre_recettes_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.csv`;
    const filePath = `${FileSystem.documentDirectory || ''}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Exporter le Livre des Recettes (Excel)',
        UTI: 'public.comma-separated-values-text',
      });
    }
  },

  /**
   * Génère le code HTML du Livre des Recettes pour impression ou PDF officiel
   */
  generatePdfHtml(
    entries: ReceiptBookEntry[],
    profile: Profile,
    periodLabel: string
  ): string {
    const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount), 0);

    const rowsHtml = entries
      .map(
        (e) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${e.entry_number}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          ${new Date(e.entry_date).toLocaleDateString('fr-FR')}
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${e.invoice_number}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${e.client_name}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
          ${e.service_nature}
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">
          ${e.payment_method.toUpperCase()}
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">
          ${Number(e.amount).toFixed(2)} €
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
      <title>Livre des Recettes - ${periodLabel}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 24px;
          margin: 0;
          font-size: 12px;
        }
        .header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 12px;
          color: #2563eb;
          font-weight: 600;
          margin-top: 2px;
        }
        .meta-col {
          text-align: right;
          font-size: 11px;
          color: #475569;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .table th {
          background: #f1f5f9;
          color: #334155;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 8px;
          border-top: 1px solid #cbd5e1;
          border-bottom: 2px solid #94a3b8;
        }
        .total-box {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 16px;
        }
        .total-card {
          background: #f8fafc;
          border: 1.5px solid #2563eb;
          border-radius: 6px;
          padding: 10px 16px;
          min-width: 260px;
          text-align: right;
        }
        .total-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .total-amount {
          font-size: 20px;
          font-weight: 800;
          color: #2563eb;
          margin-top: 2px;
        }
        .legal-notice {
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          font-size: 9px;
          color: #64748b;
          text-align: justify;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">Livre Chronologique des Recettes</div>
          <div class="subtitle">Période : ${periodLabel}</div>
        </div>
        <div class="meta-col">
          <strong>${profile.first_name} ${profile.last_name} ${profile.is_ei ? 'EI' : ''}</strong><br />
          SIRET : ${profile.siret} • REVTC : ${profile.revtc_number}<br />
          Régime : Micro-Entrepreneur (${profile.tva_mention})
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">N°</th>
            <th style="width: 12%; text-align: center;">Date</th>
            <th style="width: 15%; text-align: left;">N° Facture</th>
            <th style="width: 25%; text-align: left;">Client</th>
            <th style="width: 20%; text-align: left;">Nature Prestation</th>
            <th style="width: 10%; text-align: center;">Mode</th>
            <th style="width: 10%; text-align: right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="total-box">
        <div class="total-card">
          <div class="total-label">Chiffre d'Affaires Encaissé (URSSAF) :</div>
          <div class="total-amount">${totalAmount.toFixed(2)} €</div>
        </div>
      </div>

      <div class="legal-notice">
        Document comptable obligatoire tenu au jour le jour en application de l'article L. 123-28 du Code de commerce et de l'article 286 du Code général des impôts pour les exploitants placés sous le régime micro-entrepreneur. Les recettes sont enregistrées de manière définitive et chronologique dès encaissement effectif.
      </div>
    </body>
    </html>
    `;
  },

  /**
   * Exporte et partage en PDF
   */
  async exportAndSharePdf(
    entries: ReceiptBookEntry[],
    profile: Profile,
    periodLabel: string
  ): Promise<void> {
    const html = this.generatePdfHtml(entries, profile, periodLabel);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Livre des Recettes - ${periodLabel}`,
        UTI: 'com.adobe.pdf',
      });
    }
  },
};
