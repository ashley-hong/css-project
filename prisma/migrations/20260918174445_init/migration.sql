-- CreateTable
CREATE TABLE "Berth" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "lengthFt" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "BerthAlias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alias" TEXT NOT NULL,
    "berthId" INTEGER NOT NULL,
    CONSTRAINT "BerthAlias_berthId_fkey" FOREIGN KEY ("berthId") REFERENCES "Berth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vessel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "loaFt" REAL,
    "operator" TEXT,
    "contactInfo" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "berthId" INTEGER NOT NULL,
    "vesselId" INTEGER,
    "eventLabel" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_berthId_fkey" FOREIGN KEY ("berthId") REFERENCES "Berth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Berth_name_key" ON "Berth"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BerthAlias_alias_key" ON "BerthAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "Vessel_name_key" ON "Vessel"("name");

-- CreateIndex
CREATE INDEX "Booking_berthId_startDate_endDate_idx" ON "Booking"("berthId", "startDate", "endDate");
