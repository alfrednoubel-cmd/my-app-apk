// ==============================================================================
// SERVICE DE GÉNÉRATION DE PDF RÉGLEMENTAIRES VTC
// Conforme à l'Arrêté du 6 août 2025 relatif au justificatif de réservation préalable
// et aux obligations des micro-entrepreneurs français
// ==============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Booking, Client, Profile, Invoice } from '../types/models';
import { LEGAL_CONSTANTS } from '../constants/legal';

export const pdfService = {
  /**
   * Génère le code HTML complet du Justificatif de Réservation Préalable VTC / Bon de Commande
   */
  generateBookingHtml(booking: Booking, profile: Profile, client: Client): string {
    const eiMention = profile.is_ei ? ' EI' : '';
    const operatorName = `${profile.first_name} ${profile.last_name}${eiMention}`;
    const commercialName = profile.commercial_name ? ` - ${profile.commercial_name}` : '';
    
    const clientDisplay =
      client.type === 'entreprise'
        ? `${client.company_name} (Contact : ${client.contact_name || client.phone})`
        : `${client.last_name} ${client.first_name || ''}`;

    const reservationFormatted = new Date(booking.reservation_datetime).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const pickupFormatted = new Date(booking.pickup_datetime).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Justificatif VTC ${booking.booking_number}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 24px;
          margin: 0;
          font-size: 13px;
          line-height: 1.4;
        }
        .header-bar {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .doc-title {
          font-size: 16px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
        }
        .doc-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: #2563eb;
          margin-top: 3px;
        }
        .badge-official {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-align: right;
        }
        .grid {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }
        .card {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
          background-color: #f8fafc;
        }
        .card-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .item-label {
          color: #64748b;
          font-weight: 500;
        }
        .item-value {
          font-weight: 600;
          color: #0f172a;
          text-align: right;
        }
        .trip-box {
          border: 1.5px solid #cbd5e1;
          border-radius: 6px;
          padding: 14px;
          margin-bottom: 16px;
          background: #ffffff;
        }
        .trip-point {
          display: flex;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        .trip-point:last-child {
          margin-bottom: 0;
        }
        .trip-icon {
          font-weight: 800;
          margin-right: 8px;
          font-size: 14px;
        }
        .price-section {
          background: #f1f5f9;
          border-radius: 6px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .price-amount {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }
        .legal-notice {
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
          text-align: justify;
          line-height: 1.35;
        }
        .status-badge {
          display: inline-block;
          padding: 3px 6px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 11px;
        }
        .status-confirmed {
          background: #dcfce7;
          color: #15803d;
        }
      </style>
    </head>
    <body>
      <!-- EN-TÊTE OFFICIEL -->
      <div class="header-bar">
        <div>
          <h1 class="doc-title">${LEGAL_CONSTANTS.VTC_JUSTIFICATIF_TITLE}</h1>
          <div class="doc-subtitle">Arrêté du 6 août 2025 • Art. L. 3122-1 du Code des transports</div>
        </div>
        <div class="badge-official">
          N° ${booking.booking_number}<br />
          <span class="status-badge status-confirmed">RÉSERVATION CONFIRMÉE</span>
        </div>
      </div>

      <!-- BLOCS EXPLOITANT ET CLIENT -->
      <div class="grid">
        <div class="card">
          <div class="card-title">1. Exploitant VTC</div>
          <div class="item-row">
            <span class="item-label">Exploitant :</span>
            <span class="item-value">${operatorName}${commercialName}</span>
          </div>
          <div class="item-row">
            <span class="item-label">N° REVTC :</span>
            <span class="item-value" style="color: #2563eb;">${profile.revtc_number}</span>
          </div>
          <div class="item-row">
            <span class="item-label">SIREN / SIRET :</span>
            <span class="item-value">${profile.siret}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Téléphone :</span>
            <span class="item-value">${profile.phone}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Adresse :</span>
            <span class="item-value">${profile.address}, ${profile.postal_code} ${profile.city}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">2. Client / Donneur d'ordre</div>
          <div class="item-row">
            <span class="item-label">Nom :</span>
            <span class="item-value">${clientDisplay}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Téléphone :</span>
            <span class="item-value">${client.phone}</span>
          </div>
          ${client.email ? `
          <div class="item-row">
            <span class="item-label">E-mail :</span>
            <span class="item-value">${client.email}</span>
          </div>` : ''}
          ${client.siren_siret ? `
          <div class="item-row">
            <span class="item-label">SIREN/SIRET :</span>
            <span class="item-value">${client.siren_siret}</span>
          </div>` : ''}
          <div class="item-row">
            <span class="item-label">Passagers :</span>
            <span class="item-value">${booking.passenger_count} personne(s)</span>
          </div>
        </div>
      </div>

      <!-- HORODATAGES LÉGAUX OBLIGATOIRES -->
      <div class="card" style="margin-bottom: 16px;">
        <div class="card-title">3. Horodatages Réglementaires Immuables</div>
        <div class="item-row">
          <span class="item-label">Date et heure réelles de la réservation :</span>
          <span class="item-value" style="color: #1e293b;">${reservationFormatted}</span>
        </div>
        <div class="item-row">
          <span class="item-label">Date et heure souhaitées de prise en charge :</span>
          <span class="item-value" style="color: #2563eb; font-size: 14px;">${pickupFormatted}</span>
        </div>
        ${booking.flight_train_number ? `
        <div class="item-row">
          <span class="item-label">N° de Vol / Train :</span>
          <span class="item-value">${booking.flight_train_number}</span>
        </div>` : ''}
      </div>

      <!-- DÉTAILS DE LA COURSE -->
      <div class="trip-box">
        <div class="card-title" style="margin-bottom: 10px;">4. Itinéraire de la Prestation</div>
        <div class="trip-point">
          <span class="trip-icon" style="color: #16a34a;">🟢</span>
          <div>
            <div class="item-label" style="font-size: 11px;">LIEU DE PRISE EN CHARGE :</div>
            <div style="font-size: 14px; font-weight: 600;">${booking.pickup_address}</div>
          </div>
        </div>
        <div style="border-left: 2px dashed #94a3b8; height: 16px; margin-left: 6px; margin-bottom: 6px;"></div>
        <div class="trip-point">
          <span class="trip-icon" style="color: #dc2626;">🔴</span>
          <div>
            <div class="item-label" style="font-size: 11px;">LIEU DE DÉPOSE :</div>
            <div style="font-size: 14px; font-weight: 600;">${booking.dropoff_address}</div>
          </div>
        </div>
      </div>

      <!-- PRIX CONVENU & TVA -->
      <div class="price-section">
        <div>
          <div style="font-size: 12px; font-weight: 700; color: #475569;">PRIX CONVENU DE LA PRESTATION</div>
          <div style="font-size: 11px; color: #64748b;">${profile.tva_mention}</div>
        </div>
        <div class="price-amount">${Number(booking.agreed_price).toFixed(2)} €</div>
      </div>

      ${booking.notes ? `
      <div class="card" style="margin-bottom: 16px;">
        <div class="card-title">Notes / Instructions particulières</div>
        <div>${booking.notes}</div>
      </div>` : ''}

      <!-- MENTIONS LÉGALES DE CONTRÔLE -->
      <div class="legal-notice">
        <strong>Document justificatif obligatoire :</strong> Établi en application de l'arrêté du 6 août 2025 relatif au justificatif de réservation préalable des voitures de transport avec chauffeur (VTC) et de l'article R. 3122-11 du Code des transports. Ce document doit pouvoir être présenté immédiatement à toute réquisition des agents habilités chargés du contrôle. L'exploitant atteste sur l'honneur que la réservation a été effectuée préalablement à la prise en charge du client. Document conservé pendant un an conformément à la réglementation.
      </div>
    </body>
    </html>
    `;
  },

  /**
   * Imprime ou génère le fichier PDF natif
   */
  async createBookingPdfFile(booking: Booking, profile: Profile, client: Client): Promise<string> {
    const html = this.generateBookingHtml(booking, profile, client);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    return uri;
  },

  /**
   * Partage direct du PDF vers les applications du système (WhatsApp, Drive, Mail)
   */
  async sharePdf(pdfUri: string, mimeType: string = 'application/pdf'): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(pdfUri, {
        mimeType,
        dialogTitle: 'Partager le justificatif VTC',
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.warn("Le partage natif n'est pas disponible sur cet appareil.");
    }
  },
};
