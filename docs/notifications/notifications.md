## Overview

We use Twilio for SMS notifications. At the moment, notifications are used to alert users when new seats open up in a specific section.

## Setting Up The Dev Environment (Backend)

All the environment variables you need to set up notifications are in `template.env`.

- Make a copy of this file and name it `.env`

  - The `JWT_SECRET` can be any random string
  - `CLIENT_ORIGIN` should already be filled out (`http://localhost:5000`)

Follow these steps to get the Twilio environment variables:

1. Create a free account with Twilio.

   - You can fill out your profile like this:

   ![Profile setup](./twilioSetup.png)

2. Once you're set up, the landing page contains the info for `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
   - Note: you don't need quotes in your `.env` file; you can just have something like `TWILIO_ACCOUNT_SID=abc123`.
     ![Twilio Landing page](./twilioLandingPage.png)
3. Click on the Get Trial Twilio Phone Number button.
   - Store the value in `.env` like `TWILIO_PHONE_NUMBER=+12342342345`.
4. You need to create a Twilio Verify service to handle sending out and confirming verification codes.
   - Click on `Explore Products` on the left nav bar of the Twilio landing page
   - Find `Account Security` and click on the `Verify` product
   - Click on `Create Service Now` - you can give the service the name `SearchNEU`
   - The service SID is the value for `TWILIO_VERIFY_SERVICE_ID` ![Twilio Verify SID](./twilioVerifySID.png)

Once your `.env` file is filled out, you can start up the notification server by running `yarn dev:notifs`

## How It Works

(Copy the following code block to a [Mermaid playground](https://mermaid.live/edit#eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0NocmlzdG1hc10gLS0-fEdldCBtb25leXwgQihHbyBzaG9wcGluZylcbiAgICBCIC0tPiBDe0xldCBtZSB0aGlua31cbiAgICBDIC0tPnxPbmV8IERbTGFwdG9wXVxuICAgIEMgLS0-fFR3b3wgRVtpUGhvbmVdXG4gICAgQyAtLT58VGhyZWV8IEZbZmE6ZmEtY2FyIENhcl1cbiAgIiwibWVybWFpZCI6IntcbiAgXCJ0aGVtZVwiOiBcImRhcmtcIlxufSIsInVwZGF0ZUVkaXRvciI6ZmFsc2UsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0) if you can't view the diagram)

```mermaid
sequenceDiagram
    participant Twilio Verify
    participant Backend
    participant Frontend
    Note right of Frontend: User clicks button to sign <br> up for notifications.
    Note right of Frontend: User enters phone number <br> on modal popup.
    Frontend->>Backend: POST request with phone number
    Backend->>Twilio Verify: calls API to send verification code <br> to phone number
    Note right of Frontend: User receives verification <br> code from Verify and <br> inputs it in a modal.
    Frontend->>Backend: POST request with phone number <br> and cerification code
    Backend->>Twilio Verify: calls API to check if verification<br>is successful for that phone number.
    Twilio Verify->> Backend: if successful verification...
    Note left of Backend: Signs a JWT with a secret.<br>JWT contains <br> the phone number in<br>its payload.
    Note left of Backend: Inserts record in database<br>with autogenerated userID<br>if user with that phone <br>number doesn't exist.
    Backend->>Frontend: Sends back the signed JWT
    Note right of Frontend: Stores signed JWT as a <br>cookie on the browser
    Note right of Frontend: Anytime the search results<br> page is rendered the frontend <br>tries to fetch the user's info.
    Frontend->>Backend: If JWT exists on frontend, send GET <br>request asking for course/section<br>subscriptions for user with <br>that phone number. JWT included<br>in request.
    Note left of Backend: Verifies JWT was not modified<br>(using secret used to sign <br>JWT earlier). This means<br>the user sending the request <br>owns that phone number.
    Backend->>Frontend: Returns list of course / section <br> hashes that user subscribed to
    Note right of Frontend: User subscription info is <br>passed in to the header <br>component to render the user's <br>phone number and passed to the<br> search results to correctly toggle <br>sections/courses that the user <br>has already signed up for
    Note right of Frontend: User clicks on a toggle.
    Frontend->>Backend: Sends a `PUT` or `DELETE` request <br>to the backend (depending on <br>whether they are subscribing <br>or unsubscribing). JWT included<br>in request.
    Note left of Backend: Verifies JWT. If successful, <br>inserts or deletes a record<br>in the database for user with<br>that phone number and the<br>associated course/section <br>subscription.
    Note right of Frontend: User can log out by<br>clicking a button that <br>deletes the JWT cookie<br> on the browser.
```