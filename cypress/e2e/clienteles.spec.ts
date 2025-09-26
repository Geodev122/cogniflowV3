describe('Clienteles assignment flow', () => {
  beforeEach(() => {
    // Stub list RPC that the Clienteles component uses
    cy.intercept('POST', '/rpc/get_clients_public', (req) => {
      req.reply({ statusCode: 200, body: [{ id: 'test-client-1', initials: 'TC', referral_source: 'clinic', city: 'Testville', country: 'TV', created_at: new Date().toISOString() }] })
    }).as('getClients')

    cy.intercept('POST', '/rest/v1/assignments', (req) => {
      // simulate success response from Supabase insert
      req.reply({ statusCode: 201, body: [{ id: 'fake-assign-id', client_id: req.body.client_id, therapist_id: req.body.therapist_id, status: 'pending' }] })
    }).as('createAssignment')

    cy.intercept('POST', '/rpc/create_case_for_client', (req) => {
      // simulate DB RPC rejection when not accepted
      if (req.body.p_client_id === 'no-accepted') {
        req.reply({ statusCode: 400, body: { message: 'assignment_not_accepted' } })
      } else {
        req.reply({ statusCode: 200, body: 'new-case-uuid' })
      }
    }).as('createCase')
  })

  it('disables Request Assignment while sending and shows toast on success', () => {
    cy.visit('/therapist/clients')
    // wait for RPC data to populate rows
    cy.wait('@getClients')
    cy.get('[data-test-client-row]').should('exist')
    // target the deterministic client row
    cy.get('[data-test-client-row]').contains('TC').parents('[data-test-client-row]').within(() => {
      cy.get('[data-test-request-btn]').as('btn')
      cy.get('@btn').click()
      cy.get('@btn').should('be.disabled')
      cy.wait('@createAssignment')
      cy.contains('Assignment request sent.').should('be.visible')
    })
  })
})
