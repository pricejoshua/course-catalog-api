import express from "express";
import cors from "cors";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import twilioNotifyer from "./notifs";
import notificationsManager from "../services/notificationsManager";
import macros from "../utils/macros";

console.log("made it to twilio/server");
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN,
};

const app = express();
app.use(cors(corsOptions));
const port = 8080;
app.use(express.json());
const server = createServer(app);

server.listen(port, () => {
  console.log("Running twilio notification server on port %s", port);
});

app.get("/knockknock", (req, res) => res.send("Who's there?"));

app.post("/twilio/sms", (req, res) => twilioNotifyer.handleUserReply(req, res));

app.post("/sms/signup", (req, res) => {
  // twilio needs the phone number in E.164 format see https://www.twilio.com/docs/verify/api/verification
  const phoneNumber = req.body.phoneNumber;
  if (!phoneNumber) {
    res.status(400).send("Missing phone number.");
  }
  twilioNotifyer
    .sendVerificationCode(phoneNumber)
    .then((response) => {
      res.status(response.statusCode).send(response.message);
      return;
    })
    .catch((e) =>
      res.status(500).send("Error trying to send verification code")
    );
});

app.post("/sms/verify", (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  const verificationCode = req.body.verificationCode;
  if (!phoneNumber || !verificationCode) {
    return res.status(400).send("Missing phone number or verification code.");
  }

  twilioNotifyer
    .checkVerificationCode(phoneNumber, verificationCode)
    .then(async (response) => {
      if (response.statusCode === 200) {
        await notificationsManager.upsertUser(phoneNumber);
        const token = jwt.sign({ phoneNumber }, process.env.JWT_SECRET);
        res
          .status(response.statusCode)
          .send({ message: response.message, token });
        return;
      } else {
        res.status(response.statusCode).send(response.message);
        return;
      }
    })
    .catch((e) => {
      macros.error(e);
      res.status(500).send("Error trying to verify code");
    });
});

app.get("/user/subscriptions/:jwt", (req, res) => {
  const token = req.params.jwt;
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as any;
    const phoneNumber = decodedToken.phoneNumber;
    notificationsManager
      .getUserSubscriptions(phoneNumber)
      .then((userSubscriptions) => {
        res.status(200).send(userSubscriptions);
        return;
      })
      .catch((error) => {
        macros.error(error);
        res.status(500).send();
      });
    return;
  } catch (error) {
    res.status(401).send();
  }
});

app.put("/user/subscriptions", (req, res) => {
  const { token, sectionIds, courseIds } = req.body;
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as any;
    const phoneNumber = decodedToken.phoneNumber;
    notificationsManager
      .putUserSubscriptions(phoneNumber, sectionIds, courseIds)
      .then(() => {
        res.status(200).send();
        return;
      })
      .catch((error) => {
        macros.error(error);
        res.status(500).send();
      });
  } catch (error) {
    res.status(401).send();
  }
});

app.delete("/user/subscriptions", (req, res) => {
  const { token, sectionIds, courseIds } = req.body;
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as any;
    const phoneNumber = decodedToken.phoneNumber;
    notificationsManager
      .deleteUserSubscriptions(phoneNumber, sectionIds, courseIds)
      .then(() => {
        res.status(200).send();
        return;
      })
      .catch((error) => {
        macros.error(error);
        res.status(500).send();
      });
  } catch (error) {
    res.status(401).send();
  }
});
