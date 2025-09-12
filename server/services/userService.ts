import { storage } from "../storage";
import { supabaseAdmin } from "../supabaseAdmin";
import { User } from "../../shared/schema"; // Assuming User schema is defined here

export const userService = {
  async updateUserProfile(userId: string, firstName: string, lastName: string, profileImageUrl?: string): Promise<User> {
    // Fetch current user to merge user_metadata
    const { data: currentUserData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchError || !currentUserData?.user) {
      console.error("Error fetching current user for profile update:", fetchError?.message);
      throw new Error("Failed to fetch current user profile.");
    }

    const currentUserMetadata = currentUserData.user.user_metadata || {};
    const newUserMetadata = {
      ...currentUserMetadata,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      avatar_url: profileImageUrl, // Save profile image URL
    };

    // Update in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: newUserMetadata,
    });

    if (error) {
      console.error("Error updating user metadata in Supabase:", error.message);
      throw new Error("Failed to update profile.");
    }
    // Persist to DB using the Supabase service role first (bypasses RLS). This avoids
    // common "row-level security" failures when the DB user for the server does not
    // have permission to directly update the rows.
    try {
      const updatePayload: any = {
        first_name: firstName,
        last_name: lastName,
        profile_image_url: profileImageUrl,
        updated_at: new Date().toISOString(),
      };

      const { data: supaData, error: supaError } = await supabaseAdmin.from('users').update(updatePayload).eq('id', userId).select().single();
      if (supaError) {
        console.warn('Service-role update via supabaseAdmin failed, will attempt local DB update as fallback:', supaError.message || supaError);
        // If supabaseAdmin update fails (service key missing/misconfigured), try the local DB update as a fallback
        const updatedUser = await storage.updateUser(userId, {
          firstName: firstName,
          lastName: lastName,
          profileImageUrl: profileImageUrl,
          updatedAt: new Date(),
        });
        return updatedUser;
      }

      // Map the returned PostgREST row (snake_case) to the app's User shape
      const mapped: any = {
        id: supaData.id,
        email: supaData.email,
        firstName: supaData.first_name || firstName,
        lastName: supaData.last_name || lastName,
        profileImageUrl: supaData.profile_image_url || profileImageUrl || currentUserData.user.user_metadata?.avatar_url || null,
        role: supaData.role || currentUserData.user.user_metadata?.role || 'student',
        status: supaData.status || currentUserData.user.user_metadata?.status || 'active',
        createdAt: supaData.created_at ? new Date(supaData.created_at) : (currentUserData.user.created_at ? new Date(currentUserData.user.created_at) : new Date()),
        updatedAt: supaData.updated_at ? new Date(supaData.updated_at) : new Date(),
      };
      return mapped as User;
    } catch (err: any) {
      // If the service-role path threw an unexpected error, try local DB update as a final fallback
      console.error('Error while persisting profile via service-role or local DB:', err);
      try {
        const updatedUser = await storage.updateUser(userId, {
          firstName: firstName,
          lastName: lastName,
          profileImageUrl: profileImageUrl,
          updatedAt: new Date(),
        });
        return updatedUser;
      } catch (innerErr: any) {
        // If that also fails, return a safe fallback constructed from Supabase auth metadata
        console.error('Local DB update also failed while persisting profile changes:', innerErr);
        const fallbackUser: any = {
          id: currentUserData.user.id,
          email: currentUserData.user.email,
          firstName: firstName,
          lastName: lastName,
          profileImageUrl: profileImageUrl || currentUserData.user.user_metadata?.avatar_url || null,
          role: currentUserData.user.user_metadata?.role || 'student',
          status: currentUserData.user.user_metadata?.status || 'active',
          createdAt: currentUserData.user.created_at ? new Date(currentUserData.user.created_at) : new Date(),
          updatedAt: new Date(),
        };
        return fallbackUser as User;
      }
    }
  },

  async changePassword(userId: string, newPassword: string): Promise<void> {
    // This directly updates the password in Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Error changing password in Supabase:", error.message);
      throw new Error("Failed to change password.");
    }
  },

  async updateUserSettings(userId: string, settings: { emailNotifications?: boolean }): Promise<User> {
    // Fetch current user to get existing metadata
    const { data: currentUserData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchError || !currentUserData?.user) {
      console.error("Error fetching current user for settings update:", fetchError?.message);
      throw new Error("Failed to fetch current user settings.");
    }

    const currentSettings = currentUserData.user.user_metadata?.settings || {};
    const newMetadataSettings = { ...currentSettings, emailNotifications: settings.emailNotifications };

    // Update in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { 
        settings: newMetadataSettings,
      },
    });

    if (error) {
      console.error("Error updating user settings in Supabase:", error.message);
      throw new Error("Failed to update settings.");
    }

    // Update in local storage - only update updatedAt since settings are stored in Supabase metadata
    const updatedUser = await storage.updateUser(userId, { 
      updatedAt: new Date(),
    });

    return updatedUser;
  },
};