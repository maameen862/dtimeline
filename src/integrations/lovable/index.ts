// This integration is deprecated and no longer used.
// Lovable cloud authentication has been replaced with direct Supabase integration.
// This file is kept for reference only and can be safely removed.

export const lovable = {
  auth: {
    signInWithOAuth: async () => {
      throw new Error("Lovable auth integration is deprecated. Use Supabase directly.");
    },
  },
};
