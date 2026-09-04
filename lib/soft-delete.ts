/** Mongo omits optional null fields, so `deletedAt: null` matches nothing. */
export const notDeleted = {
  OR: [{ deletedAt: { isSet: false } }, { deletedAt: null }],
};

export function withNotDeleted<T extends Record<string, unknown>>(where: T) {
  return { AND: [notDeleted, where] };
}
