/** Prefix a site path with the deploy base ("/drums-roadmap/"). */
export const url = (path = "") => `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path}`;
