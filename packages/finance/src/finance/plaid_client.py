"""Plaid API client — link-token creation, public-token exchange, and transactions sync."""
from __future__ import annotations

import os
from typing import Any

import plaid
from plaid.api_client import ApiClient
from plaid.configuration import Configuration
from plaid.api.plaid_api import PlaidApi
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest


_ENV_MAP = {
    "sandbox":     plaid.Environment.Sandbox,
    "development": plaid.Environment.Development,
    "production":  plaid.Environment.Production,
}

# Plaid institution_name (lowercase) → our source_id
INSTITUTION_SOURCE_MAP = {
    "us bank":     "us_bank",
    "capital one": "capital_one",
    "discover":    "discover",
    "venmo":       "venmo",
}


def _make_client() -> PlaidApi:
    env_name = os.environ.get("PLAID_ENV", "sandbox").lower()
    config = Configuration(
        host=_ENV_MAP.get(env_name, plaid.Environment.Sandbox),
        api_key={
            "clientId": os.environ["PLAID_CLIENT_ID"],
            "secret":   os.environ["PLAID_SECRET"],
        },
    )
    return PlaidApi(ApiClient(config))


def institution_to_source(institution_name: str) -> str:
    key = institution_name.lower().strip()
    return INSTITUTION_SOURCE_MAP.get(key, key.replace(" ", "_"))


def create_link_token(user_id: str = "finance-user") -> str:
    client = _make_client()
    req = LinkTokenCreateRequest(
        products=[Products("transactions")],
        client_name="Finance Tracker",
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
    )
    return client.link_token_create(req).link_token


def exchange_public_token(public_token: str) -> dict[str, str]:
    client = _make_client()
    resp = client.item_public_token_exchange(
        ItemPublicTokenExchangeRequest(public_token=public_token)
    )
    return {"access_token": resp.access_token, "item_id": resp.item_id}


def sync_transactions(access_token: str, cursor: str | None = None) -> dict[str, Any]:
    """Page through Transactions Sync until has_more is False.
    Returns {added, modified, removed_ids, next_cursor}."""
    client = _make_client()
    added: list = []
    modified: list = []
    removed_ids: list[str] = []
    has_more = True
    next_cursor = cursor

    while has_more:
        kwargs: dict[str, Any] = {"access_token": access_token}
        if next_cursor:
            kwargs["cursor"] = next_cursor
        resp = client.transactions_sync(TransactionsSyncRequest(**kwargs))
        added.extend(resp.added)
        modified.extend(resp.modified)
        removed_ids.extend(r.transaction_id for r in resp.removed)
        has_more = resp.has_more
        next_cursor = resp.next_cursor

    return {"added": added, "modified": modified, "removed_ids": removed_ids, "next_cursor": next_cursor}


def plaid_tx_to_row(tx: Any, source_id: str) -> dict[str, Any]:
    """Convert a Plaid Transaction model to our DB upsert dict."""
    name = getattr(tx, "merchant_name", None) or tx.name
    category = None
    pfc = getattr(tx, "personal_finance_category", None)
    if pfc:
        category = pfc.primary
    elif getattr(tx, "category", None):
        category = tx.category[0] if tx.category else None

    return {
        "id": tx.transaction_id,
        "source": source_id,
        "date": str(tx.date),
        "description": name,
        # Plaid: positive = debit (money out), negative = credit (refund) — same sign convention as our schema
        "amount": float(tx.amount),
        "category": category,
        "raw": {"plaid_id": tx.transaction_id},
    }
