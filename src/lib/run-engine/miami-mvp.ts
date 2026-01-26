export interface MiamiDolor {
    id: string;
    label: string;
    description: string;
}

export const MIAMI_DOLORES: MiamiDolor[] = [
    { id: 'HOA_CONDO_SHOCK', label: 'Condo/HOA Shock', description: 'Owners facing massive special assessments and insurance hikes.' },
    { id: 'OUT_OF_STATE_OWNER', label: 'Out-of-State Landlord', description: 'Remote owners tired of managing Miami rentals.' },
    { id: 'FORECLOSURE_WATCH', label: 'Foreclosure/Distress', description: 'Homeowners with equity but facing financial pressure.' },
    { id: 'INHERITED_PROBATE', label: 'Inherited/Probate', description: 'Sellers dealing with estate liquidation.' },
    { id: 'UPSIZE_DREAM', label: 'Upsize Dreamers', description: 'Families outgrowing their current Miami home.' },
    { id: 'DOWNSIZE_RETREAT', label: 'Downsize Retreat', description: 'Seniors looking to cash out and move to smaller units.' },
    { id: 'DIVORCE_LIQUIDATION', label: 'Divorce Liquidation', description: 'Urgent sales due to marital separation.' }
];

export interface OfferBankItem {
    id: string;
    title: string;
    description: string;
}

export const OFFER_BANK: OfferBankItem[] = [
    { id: 'CASH_OFFER_READY', title: 'Cash Offer Buyout', description: 'Guaranteed cash offer within 72 hours for qualified properties.' },
    { id: 'EQUITY_ADVANCE', title: 'Equity Advance Fix', description: 'Advance funds to fix assessments or repairs before selling.' },
    { id: 'FREE_AUDIT_MIAMI', title: 'Free Asset Audit', description: 'Deep dive into HOA/Market value to maximize net profit.' }
];
