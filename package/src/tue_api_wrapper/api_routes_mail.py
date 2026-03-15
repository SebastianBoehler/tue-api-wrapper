from __future__ import annotations

from fastapi import APIRouter, Query

from .config import AlmaError
from .portal_service import PortalService, serialize

router = APIRouter()
portal_service = PortalService()


def _mail_client():
    return portal_service._mail_client()


def _translate_error(error: AlmaError):
    from fastapi import HTTPException

    return HTTPException(status_code=400, detail=str(error))


@router.get("/api/mail/mailboxes")
def mail_mailboxes() -> list[object]:
    try:
        client = _mail_client()
        try:
            return serialize(client.list_mailboxes())
        finally:
            client.close()
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/mail/inbox")
def mail_inbox(
    mailbox: str = Query("INBOX"),
    limit: int = Query(12, ge=1, le=50),
    unread_only: bool = False,
    query: str = "",
    sender: str = "",
) -> dict[str, object]:
    try:
        client = _mail_client()
        try:
            return serialize(
                client.fetch_mailbox_summary(
                    mailbox=mailbox,
                    limit=limit,
                    unread_only=unread_only,
                    query=query,
                    sender=sender,
                )
            )
        finally:
            client.close()
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/mail/messages/{uid}")
def mail_message(uid: str, mailbox: str = Query("INBOX")) -> dict[str, object]:
    try:
        client = _mail_client()
        try:
            return serialize(client.fetch_message_detail(uid, mailbox=mailbox))
        finally:
            client.close()
    except AlmaError as error:
        raise _translate_error(error) from error
