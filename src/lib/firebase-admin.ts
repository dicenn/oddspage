
  import * as admin from 'firebase-admin';
  import * as serviceAccount from '../../firebase-service-account.json';
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
  
  const db = admin.firestore();
  const auth = admin.auth();
  const storage = admin.storage();
  const realTimeDb = admin.database();
  
  export { admin, db, auth, storage, realTimeDb };
  