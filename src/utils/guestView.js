const storageKey = (groupId) => `guestVm_${groupId}`;

export function getGuestVirtualMemberId(groupId) {
    if (!groupId) return "";
    try {
        return sessionStorage.getItem(storageKey(groupId)) || "";
    } catch {
        return "";
    }
}

export function setGuestVirtualMemberId(groupId, virtualId) {
    if (!groupId) return;
    try {
        if (virtualId) sessionStorage.setItem(storageKey(groupId), virtualId);
        else sessionStorage.removeItem(storageKey(groupId));
    } catch {
        /* ignore */
    }
}

/** 從群組成員中挑選有效的虛擬成員 id，供訪客預覽用 */
export function resolveGuestVirtualMemberId(group, preferredId) {
    const virtualIds = Object.entries(group?.members || {})
        .filter(([, m]) => m?.isVirtual)
        .map(([id]) => id);
    if (preferredId && virtualIds.includes(preferredId)) return preferredId;
    return virtualIds[0] || "";
}
