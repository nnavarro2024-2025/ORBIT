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

    // Update in local storage
    const updatedUser = await storage.updateUser(userId, { 
      firstName: firstName, 
      lastName: lastName,
      profileImageUrl: profileImageUrl, // Save profile image URL to local DB
      updatedAt: new Date(),
    });

    return updatedUser;
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