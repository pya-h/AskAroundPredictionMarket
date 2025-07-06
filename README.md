# AskAroundPredictionMarket

A NestJS + TypeORM (PostgreSQL) backend implementation of a blockchain-native prediction market, built on top of Gnosis smart contracts.

---

## 🚀 Overview

**AskAroundPredictionMarket** is a production-ready server that powers on-chain prediction markets. Using NestJS and TypeORM, it provides:

* A **robust, modular architecture** for managing markets, questions, user accounts, staking, and resolution logic
* Integration with **Gnosis** (e.g. Conditional Tokens Framework) to enable trading binary outcome markets
* A comprehensive API layer, including automatic **Swagger documentation**

This backend is one of the flagship projects in my portfolio—enabling fast, scalable, typesafe prediction markets through modern web and blockchain technologies.

---

## 🧱 Key Features

### 1. **NestJS Structure**

* Follows a **modular folder setup** (`Modules/Controllers/Services/Entities`) for clean separation of concerns
* Uses **dependency injection** to simplify smart contract clients, database repos, and business-logic services
* Built-in **global config management** with `.env` support and environment-based behavior toggles (e.g. migrations, logging)

### 2. **TypeORM + Postgres**

* Uses TypeORM for data modeling, migrations, and database abstraction
* Entities defined with decorators—covering Users, Markets, Bets, Resolutions, Settings, and more
* Supports production-grade migrations and data integrity strategies

### 3. **Prediction Market Logic**

* Service layer connects to **Gnosis contracts** to mint, fund, and resolve outcome markets
* Manages:

  * Market creation with start/end timestamps
  * Outcome staking and accounting
  * Arbitrators and dispute flows
  * Payout calculations and token redemption

### 4. **Wallet Integration & Auth**

* Associates on-chain wallet addresses to platform users
* Authentication implemented by cookie-session, just for simplicity; You can implement you're own **JWT Authentication** logic.

### 5. **Swagger API Docs**

* Auto-generated **OpenAPI schema** to explore endpoints, request/response schemas, and try out operations
* Out-of-the-box availability via `/docs`

### 6. **Smart Contract Interaction**

* Utilizes web3/Ethers to:

  * Connect to on-chain Gnosis contracts
  * Listen to market events (e.g. stakes, resolution triggers)
  * Populate/update the relational DB with accurate event data

### 7. **Extensible & Production-ready**

* All core modules are **easily extensible** (e.g. add new market types, oracles, or DeFi integrations)
* Includes authentication, error handling, logging, and config best practices

---

## 🧪 Installation & Setup

1. **Clone** the repo
2. cd into app (backend)

   ```bash
   cd app
   ```
3. Install dependencies

   ```bash
   npm install
   ```
4. Create a `.env` file, from `.env.example`, with your Postgres and contract config.

   ```bash
   cp .env.example .env
   nano .env
   ```
5. **Run** migrations

   ```bash
   npm run migration:run
   ```
6. **Launch** server in development or production mode

   ```bash
   npm run start:dev
   ```
7. Open `/docs` to explore the API

---

## 📂 Project Structure

```
src/
├── auth/                # Authentication
├── common/              # Shared modules, DTOs, interceptors
├── gnosissync/          # Event listeners and on-chain sync engine
├── markets/             # Market creation, listing, resolution
├── users/               # User profiles, wallets, analytics
├── resolution/          # Arbitrator, dispute logic, payout handling
├── database/            # TypeORM setup, migrations
└── main.ts              # Bootstrapping + Swagger config
```

---

## 🎯 Why It’s CV-Worthy

* **Full-stack expertise**: from smart contracts & blockchain sync to REST API and DB
* **Tech stack**: modern TypeScript, NestJS, TypeORM, PostgreSQL, Ethers/web3
* **Scalable architecture**: modular, testable, and production-ready
* **Real-world application**: designed to run live markets with actual tokens and resolution logic

---

## 🛠️ Future Extensions

* Integrate *dynamic oracles* for event resolution
* Expand beyond binary outcomes (e.g., multiple-choice or numeric prediction markets)
* Add *front-end client examples* to interact with markets seamlessly (checkout ng-front folder)

---

## ✅ Summary

**AskAroundPredictionMarket** showcases a powerful backend solution for decentralized prediction markets. It highlights expertise in: backend architecture, database design, blockchain integration, secure authentication, and auto-generated API documentation. A strong, scalable foundation worthy of high-impact projects.