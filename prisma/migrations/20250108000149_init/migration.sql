/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Group` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_UserGroups" ADD CONSTRAINT "_UserGroups_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserGroups_AB_unique";

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");
