/** The business as its customers see it: on the receipt, the invoice, the label and the tracking page. */
export interface BusinessSettings {
    name: string | null;
    /** The row version an edit sends back, so a form opened before someone else saved is refused. */
    version?: string;
    logo_url: string | null;
    address: string | null;
    phone_primary: string | null;
    phone_secondary: string | null;
    /** The website and the two pages print in the invoice footer. */
    website: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    edited_on: string | null;
    edited_by: string | null;
}

export type BusinessSettingsChanges = Omit<BusinessSettings, 'edited_on' | 'edited_by'>;
