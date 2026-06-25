import { z } from "zod";

export const folderCreateSchema = z.object({
  matterId: z.string(),
  name: z.string().min(1, "卷宗名必填").max(40, "卷宗名最长 40 字")
});

export const folderRenameSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(40)
});

export const folderDeleteSchema = z.object({
  id: z.string()
});

export const folderReorderSchema = z.object({
  matterId: z.string(),
  orderedIds: z.array(z.string()).min(1)
});

export const moveDocumentToFolderSchema = z.object({
  documentId: z.string(),
  folderId: z.string().nullable()
});
