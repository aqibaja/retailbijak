from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

try:
    from database import StockComment, CommentVote, get_db
except ModuleNotFoundError:
    from backend.database import StockComment, CommentVote, get_db

router = APIRouter()

HARDCODED_USER = "user1"
HARDCODED_USERNAME = "Trader"


# ⚠️ Static routes MUST come before parameterized routes (FastAPI matches in order)


@router.get("/api/comments/hot")
def hot_stocks(db: Session = Depends(get_db)):
    """Return stocks with the most comment activity (hot stocks)."""
    counts = (
        db.query(
            StockComment.ticker,
            func.count(StockComment.id).label("cnt"),
        )
        .group_by(StockComment.ticker)
        .order_by(func.count(StockComment.id).desc())
        .limit(20)
        .all()
    )

    data = [{"ticker": row.ticker, "comment_count": row.cnt} for row in counts]
    return {"data": data, "count": len(data)}


@router.get("/api/comments/{ticker}")
def list_comments(ticker: str, db: Session = Depends(get_db)):
    """List all comments for a stock, with vote counts and user's vote status."""
    comments = (
        db.query(StockComment)
        .filter(StockComment.ticker == ticker.upper(), StockComment.parent_id == None)
        .order_by(StockComment.created_at.desc())
        .all()
    )

    # Get vote counts per comment
    vote_totals = (
        db.query(
            CommentVote.comment_id,
            func.coalesce(func.sum(CommentVote.vote), 0).label("score"),
        )
        .filter(CommentVote.comment_id.in_([c.id for c in comments]))
        .group_by(CommentVote.comment_id)
        .all()
    )
    vote_map = {row[0]: row[1] for row in vote_totals}

    # Get user's votes on these comments
    user_votes = (
        db.query(CommentVote.comment_id, CommentVote.vote)
        .filter(
            CommentVote.comment_id.in_([c.id for c in comments]),
            CommentVote.user_id == HARDCODED_USER,
        )
        .all()
    )
    user_vote_map = {row[0]: row[1] for row in user_votes}

    # Get reply count per comment
    reply_counts = (
        db.query(
            StockComment.parent_id,
            func.count(StockComment.id).label("cnt"),
        )
        .filter(
            StockComment.parent_id.in_([c.id for c in comments]),
        )
        .group_by(StockComment.parent_id)
        .all()
    )
    reply_count_map = {row[0]: row[1] for row in reply_counts}

    data = []
    for c in comments:
        data.append(
            {
                "id": c.id,
                "ticker": c.ticker,
                "user_id": c.user_id,
                "username": HARDCODED_USERNAME,
                "content": c.content,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "score": vote_map.get(c.id, 0),
                "user_vote": user_vote_map.get(c.id, 0),
                "reply_count": reply_count_map.get(c.id, 0),
            }
        )

    return {"data": data, "count": len(data)}


@router.post("/api/comments/{ticker}")
def create_comment(ticker: str, payload: dict, db: Session = Depends(get_db)):
    """Create a new comment on a stock."""
    content = (payload.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Content too long (max 2000 chars)")

    parent_id = payload.get("parent_id")
    if parent_id is not None:
        parent = db.query(StockComment).filter(StockComment.id == parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment = StockComment(
        ticker=ticker.upper(),
        user_id=HARDCODED_USER,
        content=content,
        parent_id=parent_id,
        created_at=datetime.utcnow(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "data": {
            "id": comment.id,
            "ticker": comment.ticker,
            "user_id": comment.user_id,
            "username": HARDCODED_USERNAME,
            "content": comment.content,
            "created_at": comment.created_at.isoformat() if comment.created_at else None,
            "score": 0,
            "user_vote": 0,
            "reply_count": 0,
        }
    }


@router.delete("/api/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    """Delete a comment (only own comments)."""
    comment = db.query(StockComment).filter(StockComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != HARDCODED_USER:
        raise HTTPException(status_code=403, detail="Cannot delete another user's comment")

    # Delete votes on this comment
    db.query(CommentVote).filter(CommentVote.comment_id == comment_id).delete()
    # Delete replies
    db.query(StockComment).filter(StockComment.parent_id == comment_id).delete()
    # Delete the comment itself
    db.delete(comment)
    db.commit()

    return {"ok": True}


@router.post("/api/comments/{comment_id}/vote")
def vote_comment(comment_id: int, payload: dict, db: Session = Depends(get_db)):
    """Upvote or downvote a comment. vote=1 for upvote, vote=-1 for downvote, vote=0 to remove."""
    comment = db.query(StockComment).filter(StockComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    vote_value = payload.get("vote", 0)
    if vote_value not in (1, -1, 0):
        raise HTTPException(status_code=400, detail="vote must be 1, -1, or 0")

    existing = (
        db.query(CommentVote)
        .filter(
            CommentVote.comment_id == comment_id,
            CommentVote.user_id == HARDCODED_USER,
        )
        .first()
    )

    if vote_value == 0:
        # Remove vote
        if existing:
            db.delete(existing)
    else:
        if existing:
            existing.vote = vote_value
        else:
            v = CommentVote(
                comment_id=comment_id,
                user_id=HARDCODED_USER,
                vote=vote_value,
            )
            db.add(v)

    db.commit()

    # Recalculate score
    score_row = (
        db.query(func.coalesce(func.sum(CommentVote.vote), 0).label("score"))
        .filter(CommentVote.comment_id == comment_id)
        .first()
    )
    score = score_row[0] if score_row else 0

    return {"data": {"id": comment_id, "score": score, "user_vote": vote_value}}
