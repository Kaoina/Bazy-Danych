package gateway;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator myRoutes(RouteLocatorBuilder builder, JwtFilter jwtFilter) {
        return builder.routes()
                // Trasa dla serwisu autoryzacji
                .route("auth-service", r -> r.path("/api/auth/**")
                        .uri("http://auth-service:8081"))

                // Trasa dla serwisu wydatków, zabezpieczona filtrem JWT
                .route("expense-service", r -> r.path("/api/expenses/**")
                        .filters(f -> f.filter(jwtFilter.apply(new JwtFilter.Config())))
                        .uri("http://expense-service:8082"))

                .build();
    }

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // Dozwolone źródła zapytań (frontend)
        config.setAllowedOrigins(Arrays.asList("http://localhost:5173", "http://localhost:3000"));
        // Dozwolone metody HTTP
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        // Dozwolone wszystkie nagłówki
        config.setAllowedHeaders(Arrays.asList("*"));
        // Zezwolenie na przesyłanie poświadczeń (np. ciasteczek, tokenów)
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsWebFilter(source);
    }
}
