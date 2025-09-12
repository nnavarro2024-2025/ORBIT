import { userService } from "../server/services/userService";
import dotenv from "dotenv";

// Simple script to call updateUserProfile for manual testing
(async () => {
  dotenv.config();
  const userId = process.env.TEST_USER_ID;
  if (!userId) {
    console.error('Please set TEST_USER_ID in environment to an existing user id');
    process.exit(1);
  }
  try {
    const updated = await userService.updateUserProfile(userId, 'TestFirst', 'TestLast', 'https://placehold.co/150x150');
    console.log('Update result:', updated);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(2);
  }
})();
