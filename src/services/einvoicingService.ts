// ==============================================================================
// FACTURATION ÉLECTRONIQUE (RÉFORME E-INVOICING / FACTUR-X FRANCE 2026-2027)
// Génération de métadonnées XML structurées conformes à la norme UN/CEFACT CII
// ==============================================================================

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Invoice, InvoiceItem, Profile, Client } from '../types/models';

export const einvoicingService = {
  /**
   * Génère le flux XML Factur-X (Profil Basic / Minimum conforme DGFIP)
   */
  generateFacturXXml(
    invoice: Invoice,
    profile: Profile,
    client: Client,
    items: InvoiceItem[]
  ): string {
    const issueDateStr = invoice.invoice_date.replace(/-/g, '');
    const isCreditNote = invoice.is_credit_note;
    const typeCode = isCreditNote ? '381' : '380'; // 380 = Commercial Invoice, 381 = Credit Note

    const sellerName = `${profile.first_name} ${profile.last_name}${profile.is_ei ? ' EI' : ''}`;
    const buyerName =
      client.type === 'entreprise'
        ? client.company_name || 'Entreprise'
        : `${client.last_name} ${client.first_name || ''}`.trim();

    const linesXml = items
      .map(
        (it, idx) => `
      <ram:IncludedSupplyChainTradeLineItem>
        <ram:AssociatedDocumentLineDocument>
          <ram:LineID>${idx + 1}</ram:LineID>
        </ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct>
          <ram:Name>${it.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</ram:Name>
        </ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement>
          <ram:NetPriceProductTradePrice>
            <ram:ChargeAmount>${Number(it.unit_price).toFixed(2)}</ram:ChargeAmount>
          </ram:NetPriceProductTradePrice>
        </ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery>
          <ram:BilledQuantity unitCode="C62">${Number(it.quantity).toFixed(0)}</ram:BilledQuantity>
        </ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement>
          <ram:ApplicableTradeTax>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:CategoryCode>E</ram:CategoryCode>
            <ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>
          </ram:ApplicableTradeTax>
          <ram:SpecifiedTradeSettlementLineMonetarySummation>
            <ram:LineTotalAmount>${Number(it.total_price).toFixed(2)}</ram:LineTotalAmount>
          </ram:SpecifiedTradeSettlementLineMonetarySummation>
        </ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${invoice.invoice_number}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDateStr}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${linesXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${sellerName}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${profile.siret}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${profile.postal_code}</ram:PostcodeCode>
          <ram:LineOne>${profile.address}</ram:LineOne>
          <ram:CityName>${profile.city}</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${buyerName}</ram:Name>
        ${
          client.siren_siret
            ? `<ram:SpecifiedLegalOrganization>
                 <ram:ID schemeID="0002">${client.siren_siret}</ram:ID>
               </ram:SpecifiedLegalOrganization>`
            : ''
        }
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery />
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>0.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:ExemptionReason>TVA non applicable, art. 293 B du CGI</ram:ExemptionReason>
        <ram:BasisAmount>${Number(invoice.total_ht).toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>E</ram:CategoryCode>
        <ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${Number(invoice.total_ht).toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${Number(invoice.total_ht).toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">0.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${Number(invoice.total_ttc).toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${Number(invoice.total_ttc).toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
  },

  /**
   * Exporte et partage le fichier structuré Factur-X XML
   */
  async exportFacturXXml(
    invoice: Invoice,
    profile: Profile,
    client: Client,
    items: InvoiceItem[]
  ): Promise<void> {
    const xml = this.generateFacturXXml(invoice, profile, client, items);
    const fileName = `facturx_${invoice.invoice_number.replace(/-/g, '_')}.xml`;
    const filePath = `${FileSystem.documentDirectory || ''}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, xml, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/xml',
        dialogTitle: `Facturation Électronique - Factur-X ${invoice.invoice_number}`,
        UTI: 'public.xml',
      });
    }
  },
};
