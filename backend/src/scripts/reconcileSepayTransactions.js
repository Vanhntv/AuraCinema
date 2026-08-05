import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import "../models/Booking.js";
import "../models/Payment.js";
import "../models/SepayTransaction.js";
import { recordSepayTransaction } from "../controllers/sepayWebhookControllers.js";

const SEPAY_TRANSACTIONS_URL = "https://userapi.sepay.vn/v2/transactions";

const toSepayDateTime = (date) => date.toISOString().slice(0, 19).replace("T", " ");

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
};

const normalizeApiTransaction = (transaction) => ({
  id: transaction.id,
  gateway: transaction.bank_brand_name,
  transactionDate: transaction.transaction_date,
  accountNumber: transaction.account_number,
  subAccount: transaction.va || "",
  code: transaction.code,
  content: transaction.transaction_content,
  transferType: Number(transaction.amount_in || 0) > 0 ? "in" : "out",
  description: transaction.description || "",
  transferAmount: Number(transaction.amount_in || transaction.amount_out || 0),
  accumulated: Number(transaction.accumulated || 0),
  referenceCode: transaction.reference_number,
  rawApiTransaction: transaction,
});

const fetchSepayTransactions = async ({ dateFrom, dateTo, page }) => {
  const params = new URLSearchParams({
    transaction_date_from: dateFrom,
    transaction_date_to: dateTo,
    per_page: "100",
    page: String(page),
  });

  const bankAccountId = getArgValue("bank-account-id");
  if (bankAccountId) {
    params.set("bank_account_id", bankAccountId);
  }

  const response = await fetch(`${SEPAY_TRANSACTIONS_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${process.env.SEPAY_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SePay API lỗi HTTP ${response.status}: ${body}`);
  }

  const result = await response.json();
  return Array.isArray(result.data) ? result.data : [];
};

const reconcileSepayTransactions = async () => {
  if (!process.env.SEPAY_API_TOKEN) {
    throw new Error("Thiếu SEPAY_API_TOKEN trong .env");
  }

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFrom = getArgValue("from") || toSepayDateTime(defaultFrom);
  const dateTo = getArgValue("to") || toSepayDateTime(now);

  await connectDB();

  let page = 1;
  let totalFetched = 0;
  let inserted = 0;

  while (true) {
    const transactions = await fetchSepayTransactions({ dateFrom, dateTo, page });
    totalFetched += transactions.length;

    for (const transaction of transactions) {
      const result = await recordSepayTransaction({
        payload: normalizeApiTransaction(transaction),
        source: "api",
      });

      if (result.inserted) {
        inserted += 1;
      }
    }

    if (transactions.length < 100) {
      break;
    }

    page += 1;
  }

  console.log(`SePay fetched=${totalFetched} inserted=${inserted} from="${dateFrom}" to="${dateTo}"`);
};

reconcileSepayTransactions()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
