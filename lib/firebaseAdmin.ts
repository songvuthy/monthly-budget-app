import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let firestore: Firestore | null = null;

// Initialization is lazy (only runs when a route actually queries data) so
// that `next build` doesn't fail just because credentials aren't present yet.
function getAdminApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    // Explicit service account — used for local dev and for hosts outside
    // Google Cloud (e.g. Vercel), where there's no ambient identity.
    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    // No explicit key provided. If this app is actually running on Firebase
    // Hosting / Cloud Functions / Cloud Run in the same Google Cloud project
    // as your Firestore database, this works automatically via Application
    // Default Credentials — no secrets to manage at all. If it's running
    // somewhere else without those three env vars set, Firestore calls will
    // fail with a Google Auth error explaining that no credentials were found.
    app = initializeApp();
  }
  return app;
}

export function getDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getAdminApp());
  }
  return firestore;
}
