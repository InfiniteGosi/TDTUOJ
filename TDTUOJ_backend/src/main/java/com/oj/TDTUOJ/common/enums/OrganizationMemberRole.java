package com.oj.TDTUOJ.common.enums;

/**
 * A member's permission level within an organization, held on the membership record and
 * checked when authorizing org management actions. OWNER outranks ADMIN, which outranks
 * MEMBER.
 */
public enum OrganizationMemberRole {
    OWNER,
    ADMIN,
    MEMBER
}
