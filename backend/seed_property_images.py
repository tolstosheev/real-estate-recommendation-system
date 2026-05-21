import asyncio
import io
import logging
import random

import httpx
from minio import Minio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.db import engine as db_engine

IMAGES_PER_PROPERTY = 4
CONCURRENCY = 10

ARCHITECTURE_IDS = [
    598, 599, 600, 602, 603, 604,
    1139, 1140, 1141, 1142, 1143, 1144, 1145, 1146, 1147, 1148,
    1149, 1150, 1151, 1152, 1153, 1154, 1155, 1156, 1157, 1158,
    1159, 1160, 1161, 1162, 1163, 1164, 1165, 1166, 1167, 1168,
    1169, 1170, 1171, 1172, 1173, 1174, 1175, 1176, 1177, 1178,
    1179, 1180, 1181, 1182, 1183, 1184, 1185, 1186, 1187, 1188,
    1189, 1190, 1191, 1192, 1193, 1194, 1195, 1196, 1197, 1198,
    1199, 1200, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208,
    1209, 1210, 1211, 1212, 1213, 1214, 1215, 1216, 1217, 1218,
    1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226, 1227, 1228,
    1229, 1230, 1231, 1232, 1233, 1234, 1235, 1236, 1237, 1238,
]

PLACEHOLD_BASE = "https://placeholdpicsum.dev/photo/id"

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("seed_images")


def _get_minio_client() -> Minio:
    endpoint = settings.S3_ENDPOINT.replace("http://", "").replace("https://", "")
    return Minio(
        endpoint,
        access_key=settings.S3_ACCESS_KEY,
        secret_key=settings.S3_SECRET_KEY,
        secure=settings.S3_ENDPOINT.startswith("https"),
    )


async def _download_one(
    sem: asyncio.Semaphore,
    http_client: httpx.AsyncClient,
    minio_client: Minio,
    img_id: int,
) -> str | None:
    async with sem:
        url = f"{PLACEHOLD_BASE}/{img_id}/640/480"
        try:
            resp = await http_client.get(url)
            resp.raise_for_status()
            img_bytes = resp.content
            filename = f"re_{img_id}.jpg"
            minio_client.put_object(
                settings.S3_BUCKET,
                filename,
                io.BytesIO(img_bytes),
                length=len(img_bytes),
                content_type="image/jpeg",
            )
            return f"{settings.S3_PUBLIC_URL}/{filename}"
        except Exception as e:
            logger.warning(f"  Failed image {img_id}: {e}")
            return None


async def main():
    client = _get_minio_client()
    if not client.bucket_exists(settings.S3_BUCKET):
        client.make_bucket(settings.S3_BUCKET)
        logger.info(f"Created bucket: {settings.S3_BUCKET}")

    async_session = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        rows = (await session.execute(
            text("SELECT id FROM properties WHERE COALESCE(array_length(images, 1), 0) = 0")
        )).all()
        prop_ids = [row[0] for row in rows]

    total = len(prop_ids)
    if total == 0:
        logger.info("No properties without images found.")
        return

    logger.info(f"Found {total} properties. Downloading {len(ARCHITECTURE_IDS)} unique real estate images...")

    sem = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as http_client:
        tasks = [_download_one(sem, http_client, client, img_id) for img_id in ARCHITECTURE_IDS]
        results = await asyncio.gather(*tasks)

    image_urls = [r for r in results if r is not None]
    if not image_urls:
        logger.error("No images downloaded. Aborting.")
        return

    logger.info(f"Downloaded {len(image_urls)} unique images. Assigning to {total} properties...")

    batch_size = 50
    for i in range(0, total, batch_size):
        batch = prop_ids[i:i + batch_size]
        async with async_session() as session:
            for prop_id in batch:
                urls = random.sample(image_urls, min(IMAGES_PER_PROPERTY, len(image_urls)))
                await session.execute(
                    text("UPDATE properties SET images = :images WHERE id = :id"),
                    {"images": urls, "id": prop_id},
                )
            await session.commit()
        logger.info(f"  Processed {min(i + batch_size, total)}/{total}")

    logger.info(f"\nDone! {total} properties updated, {len(image_urls)} unique images.")


if __name__ == "__main__":
    asyncio.run(main())
