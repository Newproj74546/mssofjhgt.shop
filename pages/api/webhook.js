import { buffer } from "micro";
import * as admin from "firebase-admin";

const serviceAccount = {
  type: "service_account",
  project_id: "Jayfootwear-68c74",
  private_key_id: "c488eca553c6d0096e5872067aff467e1bb55b2b",
  private_key: process.env.NEXT_PUBLIC_FIREBASE_SECRET,
  client_email:
    "",
  client_id: "",
  auth_uri: "",
  token_uri: "",
  auth_provider_x509_cert_url: "",
  client_x509_cert_url:
    "",
};

const app = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  : admin.app();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_SIGNING_SECRET;

const fulfillOrder = async (session) => {
  return app
    .firestore()
    .collection("users")
    .doc(session.metadata.email)
    .collection("orders")
    .doc(session.id)
    .set({
      amount: (session.amount_total / 100) * 10000,
      amount_shipping: (session.total_details.amount_shipping / 100) * 10000,
      images: JSON.parse(session.metadata.images),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })
    .then(console.log(`Order Success ${session.id}`));
};
export default async (req, res) => {
  if (req.method === "POST") {
    const requestBuffer = await buffer(req);
    const payload = requestBuffer.toString();
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      console.log("error");
      return res.status(400).send("error");
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      return fulfillOrder(session)
        .then(() => res.status(200))
        .catch((err) => res.status(400).send("webhook error" + err.message));
    }
  }
};

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
