// Edit the choices people can pick on the Join page.
export const JOIN_ROLES = [
  "Penn State student",
  "Penn State faculty or staff",
  "Penn State alum",
  "State College resident",
  "Other connection",
] as const;

export const MAX_PROOF_BYTES = 1_500_000;

// Set to true to ask applicants for a proof photo again (the photo code is kept, just switched off).
export const JOIN_REQUIRES_PROOF = false;
