/** The signed-in person's own details. Email and role are shown, never changed here: an admin owns them. */
export interface Profile {
    email: string;
    name: string;
    mobile_number: string | null;
    designation: string | null;
    photo: string | null;
}

export type ProfileChanges = Pick<Profile, 'name' | 'mobile_number' | 'designation' | 'photo'>;
