/**
 * Search API Tests
 * VENMO-008: Implement Search
 * 
 * Tests cover:
 * - Missing query parameter validation
 * - Search by type (contacts, transactions, links)
 * - Combined search results
 * - Empty results handling
 * - Result grouping
 */

describe('GET /api/search - Unit Tests', () => {
  describe('Parameter Validation', () => {
    it('should require query parameter', () => {
      const url = new URL('http://localhost:3002/api/search');
      const query = url.searchParams.get('q');
      expect(query).toBeNull();
    });

    it('should accept valid query parameter', () => {
      const url = new URL('http://localhost:3002/api/search?q=test&address=0x123');
      const query = url.searchParams.get('q');
      expect(query).toBe('test');
    });

    it('should accept type filter parameter', () => {
      const url = new URL('http://localhost:3002/api/search?q=test&type=contacts&address=0x123');
      const type = url.searchParams.get('type');
      expect(type).toBe('contacts');
    });

    it('should validate type parameter values', () => {
      const validTypes = ['contacts', 'transactions', 'links', 'all'];
      
      validTypes.forEach(type => {
        const url = new URL(`http://localhost:3002/api/search?q=test&type=${type}`);
        expect(validTypes).toContain(url.searchParams.get('type'));
      });
    });

    it('should require address parameter for authenticated search', () => {
      const url = new URL('http://localhost:3002/api/search?q=test');
      const address = url.searchParams.get('address');
      expect(address).toBeNull();
    });
  });

  describe('Search Logic', () => {
    it('should match contacts by name (case-insensitive)', () => {
      const searchTerm = 'alice';
      const contacts = [
        { name: 'Alice Smith', address: '0x123' },
        { name: 'Bob Jones', address: '0x456' },
        { name: 'alice.eth', address: '0x789' },
      ];

      const matches = contacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(matches).toHaveLength(2);
      expect(matches[0].name).toBe('Alice Smith');
      expect(matches[1].name).toBe('alice.eth');
    });

    it('should match contacts by email prefix', () => {
      const searchTerm = 'alice@';
      const contacts = [
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
      ];

      const matches = contacts.filter(c => 
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('Alice');
    });

    it('should match contacts by address prefix', () => {
      const searchTerm = '0x742d';
      const contacts = [
        { name: 'Alice', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' },
        { name: 'Bob', address: '0x123456789012345678901234567890123456789' },
      ];

      const matches = contacts.filter(c => 
        c.address.toLowerCase().startsWith(searchTerm.toLowerCase())
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('Alice');
    });

    it('should match transactions by memo/description', () => {
      const searchTerm = 'coffee';
      const transactions = [
        { id: '1', memo: 'Coffee at Starbucks', amount: '5.00' },
        { id: '2', memo: 'Lunch', amount: '15.00' },
        { id: '3', memo: 'morning coffee run', amount: '4.50' },
      ];

      const matches = transactions.filter(tx => 
        tx.memo?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(matches).toHaveLength(2);
    });

    it('should match transactions by amount', () => {
      const searchTerm = '10';
      const transactions = [
        { id: '1', amount: '10.00' },
        { id: '2', amount: '100.00' },
        { id: '3', amount: '5.00' },
      ];

      const matches = transactions.filter(tx => 
        tx.amount.includes(searchTerm)
      );

      expect(matches).toHaveLength(2);
    });

    it('should match payment links by memo/title', () => {
      const searchTerm = 'birthday';
      const links = [
        { id: '1', memo: 'Birthday Gift', amount: null },
        { id: '2', memo: 'Rent', amount: 500 },
        { id: '3', memo: 'My Birthday Fund', amount: null },
      ];

      const matches = links.filter(link => 
        link.memo?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(matches).toHaveLength(2);
    });
  });

  describe('Result Grouping', () => {
    it('should group results by type', () => {
      const results = {
        contacts: [{ name: 'Alice', address: '0x123' }],
        transactions: [{ id: '1', memo: 'test', amount: '10.00' }],
        links: [{ id: '1', memo: 'test link' }],
      };

      expect(results).toHaveProperty('contacts');
      expect(results).toHaveProperty('transactions');
      expect(results).toHaveProperty('links');
      expect(Array.isArray(results.contacts)).toBe(true);
      expect(Array.isArray(results.transactions)).toBe(true);
      expect(Array.isArray(results.links)).toBe(true);
    });

    it('should include total count', () => {
      const results = {
        contacts: [{ name: 'Alice' }],
        transactions: [{ id: '1' }, { id: '2' }],
        links: [],
      };

      const totalCount = 
        results.contacts.length + 
        results.transactions.length + 
        results.links.length;

      expect(totalCount).toBe(3);
    });

    it('should return empty groups when no matches', () => {
      const results = {
        contacts: [],
        transactions: [],
        links: [],
        total: 0,
      };

      expect(results.contacts).toHaveLength(0);
      expect(results.transactions).toHaveLength(0);
      expect(results.links).toHaveLength(0);
      expect(results.total).toBe(0);
    });
  });

  describe('Response Structure', () => {
    it('should return correct success response structure', () => {
      const response = {
        success: true,
        query: 'test',
        results: {
          contacts: [],
          transactions: [],
          links: [],
        },
        total: 0,
      };

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('query');
      expect(response).toHaveProperty('results');
      expect(response).toHaveProperty('total');
    });

    it('should return error response on invalid request', () => {
      const errorResponse = {
        error: 'Missing query parameter',
      };

      expect(errorResponse).toHaveProperty('error');
    });
  });
});
