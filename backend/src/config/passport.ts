import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getOrCreatePerson } from '../services/personService';
import { createDefaultProject } from '../services/projectService';
import { createDefaultTags } from '../services/tagService';
import { logger } from '../utils/logger';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables');
}

const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Get or create person
        const person = await getOrCreatePerson({ email, name });

        // Check if person has any projects
        const { getProjectsByPersonId } = await import('../services/projectService');
        const projects = await getProjectsByPersonId(person.id);

        // If first time login (no projects), create default project and tags
        if (projects.length === 0) {
          logger.info(`First login for user ${email}, creating default project and tags`);
          const defaultProject = await createDefaultProject(person.id);
          await createDefaultTags(defaultProject.id);
          logger.info(`Default project and tags created for user ${email}`);
        }

        // Return person to be stored in session
        return done(null, person);
      } catch (error) {
        logger.error('Error in Google OAuth callback:', error);
        return done(error as Error);
      }
    }
  )
);

// Serialize user to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const { findPersonById } = await import('../services/personService');
    const person = await findPersonById(id);
    
    if (!person) {
      return done(new Error('User not found'));
    }
    
    done(null, person);
  } catch (error) {
    logger.error('Error deserializing user:', error);
    done(error);
  }
});

export default passport;
