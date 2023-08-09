# darkpools-vault-subgraph

This document provides a step-by-step guide on how to deploy your subgraph to both Binance Smart Chain and Arbitrum using the provided scripts in your `package.json` file. Make sure you have completed the code generation, building, and authentication steps before proceeding with the deployment.

## Table of Contents

1. Prerequisites
2. Installing Dependencies
3. Code Generation
4. Building
5. Authentication
6. Deploying to Binance Smart Chain
7. Deploying to Arbitrum

## 1. Prerequisites

- Node.js and npm installed.
- TheGraph CLI (`graph-cli`) installed.

## 2. Installing Dependencies

Before you begin, make sure to install the project's dependencies by running:

```bash
npm install
```

## 3. Code Generation

Run the following commands to generate the subgraph's code:

```bash
npm run codegen:arbitrum
npm run codegen:binance
```

## 4. Building

After code generation, you need to build your subgraph using the following commands:

```bash
npm run build:arbitrum
npm run build:binance
```

## 5. Authentication

To deploy your subgraph, you'll need to authenticate with TheGraph's network. Run the following command and follow the prompts:

```bash
npm run auth
```

## 6. Deploying to Binance Smart Chain

Deploy your subgraph to Binance Smart Chain using the following command:

```bash
npm run deploy:binance
```

## 7. Deploying to Arbitrum

Deploy your subgraph to Arbitrum using the following command:

```bash
npm run deploy:arbitrum
```

---

Congratulations! You've successfully deployed your subgraph to both Binance Smart Chain and Arbitrum using the provided scripts. Your subgraph should now be accessible and queryable on TheGraph's network.


