package com.grocery.microservices.order.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import java.util.Collection;
import java.util.List;

/**
 * Converts a validated JWT into an authentication token whose principal is the
 * {@link AuthenticatedCustomer} built from the immutable {@code sub} claim.
 *
 * <p>Domain/application code consumes {@code AuthenticatedCustomer}, never the
 * raw JWT or Spring Security context.</p>
 */
public final class CustomerJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final JwtAuthenticationConverter delegate = new JwtAuthenticationConverter();

    public CustomerJwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("scope");
        authoritiesConverter.setAuthorityPrefix("SCOPE_");
        delegate.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = delegate.convert(jwt).getAuthorities();
        return new CustomerAuthenticationToken(jwt, List.copyOf(authorities));
    }

    /**
     * Authentication focused on the {@link AuthenticatedCustomer}. Exposes the
     * immutable {@code sub} as the principal so controllers can bind it with
     * {@code @AuthenticationPrincipal}.
     */
    static final class CustomerAuthenticationToken extends AbstractAuthenticationToken {

        private final Jwt jwt;
        private final AuthenticatedCustomer customer;

        CustomerAuthenticationToken(Jwt jwt, Collection<GrantedAuthority> authorities) {
            super(authorities);
            this.jwt = jwt;
            this.customer = new AuthenticatedCustomer(jwt.getSubject());
            setAuthenticated(true);
        }

        @Override
        public Object getCredentials() {
            return null;
        }

        @Override
        public Object getPrincipal() {
            return customer;
        }

        @Override
        public String getName() {
            return customer.customerId();
        }
    }
}