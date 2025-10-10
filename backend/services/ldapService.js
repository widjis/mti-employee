import { Client } from 'ldapts';
import config from '../config/app.js';
import User from '../models/User.js';
import { executeQuery } from '../config/database.js';

/**
 * LDAP/Active Directory Authentication Service
 * Handles SSO authentication with domain controllers
 */
class LDAPService {
  constructor() {
    this.ldapConfig = {
      url: process.env.LDAP_URL || 'ldap://your-domain-controller.com:389',
      baseDN: process.env.LDAP_BASE_DN || 'DC=yourdomain,DC=com',
      bindDN: process.env.LDAP_BIND_DN || 'CN=service-account,OU=Service Accounts,DC=yourdomain,DC=com',
      bindPassword: process.env.LDAP_BIND_PASSWORD || '',
      userSearchBase: process.env.LDAP_USER_SEARCH_BASE || 'OU=Users,DC=yourdomain,DC=com',
      userSearchFilter: process.env.LDAP_USER_SEARCH_FILTER || '(sAMAccountName={username})',
      groupSearchBase: process.env.LDAP_GROUP_SEARCH_BASE || 'OU=Groups,DC=yourdomain,DC=com',
      timeout: parseInt(process.env.LDAP_TIMEOUT) || 5000,
      connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT) || 10000,
      tlsOptions: {
        rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'
      }
    };
  }

  /**
   * Authenticate user against Active Directory
   * @param {string} username - Domain username (without domain)
   * @param {string} password - User password
   * @returns {Object} Authentication result with user info
   */
  async authenticateUser(username, password) {
    const client = new Client({
      url: this.ldapConfig.url,
      timeout: this.ldapConfig.timeout,
      connectTimeout: this.ldapConfig.connectTimeout,
      tlsOptions: this.ldapConfig.tlsOptions
    });

    try {
      // Bind with service account to search for user
      await client.bind(this.ldapConfig.bindDN, this.ldapConfig.bindPassword);

      // Search for user in AD
      const searchFilter = this.ldapConfig.userSearchFilter.replace('{username}', username);
      const searchOptions = {
        scope: 'sub',
        filter: searchFilter,
        attributes: [
          'sAMAccountName',
          'displayName',
          'mail',
          'department',
          'title',
          'telephoneNumber',
          'memberOf',
          'userAccountControl',
          'distinguishedName'
        ]
      };

      const { searchEntries } = await client.search(this.ldapConfig.userSearchBase, searchOptions);

      if (searchEntries.length === 0) {
        throw new Error('User not found in Active Directory');
      }

      const userEntry = searchEntries[0];
      const userDN = userEntry.distinguishedName;

      // Check if account is disabled
      const userAccountControl = parseInt(userEntry.userAccountControl) || 0;
      if (userAccountControl & 2) { // Account disabled flag
        throw new Error('User account is disabled in Active Directory');
      }

      // Unbind service account
      await client.unbind();

      // Create new client for user authentication
      const userClient = new Client({
        url: this.ldapConfig.url,
        timeout: this.ldapConfig.timeout,
        connectTimeout: this.ldapConfig.connectTimeout,
        tlsOptions: this.ldapConfig.tlsOptions
      });

      // Authenticate user with their credentials
      await userClient.bind(userDN, password);
      await userClient.unbind();

      // Extract user information
      const userInfo = {
        username: userEntry.sAMAccountName,
        displayName: userEntry.displayName,
        email: userEntry.mail,
        department: userEntry.department,
        title: userEntry.title,
        phone: userEntry.telephoneNumber,
        groups: Array.isArray(userEntry.memberOf) ? userEntry.memberOf : [userEntry.memberOf].filter(Boolean),
        distinguishedName: userEntry.distinguishedName
      };

      return {
        success: true,
        user: userInfo
      };

    } catch (error) {
      console.error('LDAP Authentication Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    } finally {
      try {
        await client.unbind();
      } catch (e) {
        // Ignore unbind errors
      }
    }
  }

  /**
   * Map AD groups to application roles
   * @param {Array} groups - User's AD group memberships
   * @returns {string} Mapped application role
   */
  mapGroupsToRole(groups) {
    const groupRoleMapping = {
      [process.env.LDAP_GROUP_SUPERADMIN]: 'superadmin',
      [process.env.LDAP_GROUP_ADMIN]: 'admin',
      [process.env.LDAP_GROUP_HR_GENERAL]: 'hr_general',
      [process.env.LDAP_GROUP_FINANCE]: 'finance',
      [process.env.LDAP_GROUP_DEP_REP]: 'dep_rep'
    };

    // Check for highest privilege role first
    for (const group of groups) {
      if (groupRoleMapping[group]) {
        return groupRoleMapping[group];
      }
    }

    // Default role for domain users
    return 'employee';
  }

  /**
   * Sync domain user with local database
   * @param {Object} adUser - User info from Active Directory
   * @returns {Object} Local user record
   */
  async syncDomainUser(adUser) {
    try {
      // Check if user already exists
      let localUser = await User.findByUsername(adUser.username);
      
      const role = this.mapGroupsToRole(adUser.groups);
      const userData = {
        username: adUser.username,
        name: adUser.displayName || adUser.username,
        role: role,
        department: adUser.department || null,
        auth_type: 'domain',
        domain_username: adUser.username,
        last_domain_sync: new Date().toISOString()
      };

      if (localUser) {
        // Update existing user
        const updateQuery = `
          UPDATE dbo.login 
          SET name = @name, 
              role = @role, 
              department = @department,
              auth_type = @auth_type,
              domain_username = @domain_username,
              last_domain_sync = @last_domain_sync,
              updated_at = GETDATE()
          WHERE username = @username
        `;
        
        await executeQuery(updateQuery, userData);
        localUser = await User.findByUsername(adUser.username);
      } else {
        // Create new user (no local password for domain users)
        localUser = await User.create({
          ...userData,
          password: '', // ensure NOT NULL constraint is satisfied if present
        });
      }

      return localUser;
    } catch (error) {
      console.error('Error syncing domain user:', error);
      throw error;
    }
  }

  /**
   * Test LDAP connection
   * @returns {Object} Connection test result
   */
  async testConnection() {
    const client = new Client({
      url: this.ldapConfig.url,
      timeout: this.ldapConfig.timeout,
      connectTimeout: this.ldapConfig.connectTimeout,
      tlsOptions: this.ldapConfig.tlsOptions
    });

    try {
      await client.bind(this.ldapConfig.bindDN, this.ldapConfig.bindPassword);
      await client.unbind();
      
      return {
        success: true,
        message: 'LDAP connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user info from AD without authentication
   * @param {string} username - Domain username
   * @returns {Object} User information from AD
   */
  async getUserInfo(username) {
    const client = new Client({
      url: this.ldapConfig.url,
      timeout: this.ldapConfig.timeout,
      connectTimeout: this.ldapConfig.connectTimeout,
      tlsOptions: this.ldapConfig.tlsOptions
    });

    try {
      await client.bind(this.ldapConfig.bindDN, this.ldapConfig.bindPassword);

      const searchFilter = this.ldapConfig.userSearchFilter.replace('{username}', username);
      const searchOptions = {
        scope: 'sub',
        filter: searchFilter,
        attributes: [
          'sAMAccountName',
          'displayName',
          'mail',
          'department',
          'title',
          'telephoneNumber',
          'memberOf'
        ]
      };

      const { searchEntries } = await client.search(this.ldapConfig.userSearchBase, searchOptions);
      await client.unbind();

      if (searchEntries.length === 0) {
        return null;
      }

      const userEntry = searchEntries[0];
      return {
        username: userEntry.sAMAccountName,
        displayName: userEntry.displayName,
        email: userEntry.mail,
        department: userEntry.department,
        title: userEntry.title,
        phone: userEntry.telephoneNumber,
        groups: Array.isArray(userEntry.memberOf) ? userEntry.memberOf : [userEntry.memberOf].filter(Boolean)
      };
    } catch (error) {
      console.error('Error getting user info from AD:', error);
      return null;
    }
  }
}

export default new LDAPService();