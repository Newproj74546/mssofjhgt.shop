import { buffer } from "micro";
import * as admin from "firebase-admin";

// Firebase service account
const serviceAccount = {
  type: "service_account",
  project_id: "Jayfootwear-68c74",
  private_key: process.env.NEXT_PUBLIC_FIREBASE_SECRET.replace(/\\n/g, "\n"), // Ensure newlines are correct
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  token_uri: "https://oauth2.googleapis.com/token",
};

// Initialize Firebase app once
const app = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  : admin.app();

// Stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_SIGNING_SECRET;

// Function to fulfill order in Firestore
const fulfillOrder = async (session) => {
  return app
    .firestore()
    .collection("users")
    .doc(session.metadata.email)
    .collection("orders")
    .doc(session.id)
    .set({
      amount: session.amount_total,
      amount_shipping: session.total_details.amount_shipping,
      images: JSON.parse(session.metadata.images),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })
    .then(() => console.log(`✅ Order recorded: ${session.id}`));
};

// Webhook handler
export default async (req, res) => {
  if (req.method === "POST") {
    const requestBuffer = await buffer(req);
    const payload = requestBuffer.toString();
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      console.error("❌ Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      return fulfillOrder(session)
        .then(() => res.status(200).end())
        .catch((err) =>
          res.status(400).send(`Webhook fulfillment error: ${err.message}`)
        );
    }

    res.status(200).end();
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
};

// Required for Stripe webhooks in Next.js
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
