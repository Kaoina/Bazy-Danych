package auth_service.user;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Dostęp do tabeli users — wyłącznie osadzone zapytania SQL (bez ORM).
 */
@Repository
@RequiredArgsConstructor
public class UserDao {

    private static final String SQL_EXISTS_BY_EMAIL =
            "SELECT COUNT(*) FROM users WHERE email = ?";

    private static final String SQL_FIND_BY_EMAIL =
            "SELECT id, email, password, name FROM users WHERE email = ?";

    private static final String SQL_FIND_BY_ID =
            "SELECT id, email, password, name FROM users WHERE id = ?";

    private static final String SQL_INSERT =
            "INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)";

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<User> USER_ROW_MAPPER = (rs, rowNum) -> User.builder()
            .id((UUID) rs.getObject("id"))
            .email(rs.getString("email"))
            .password(rs.getString("password"))
            .name(rs.getString("name"))
            .build();

    public boolean existsByEmail(String email) {
        Integer count = jdbcTemplate.queryForObject(SQL_EXISTS_BY_EMAIL, Integer.class, email);
        return count != null && count > 0;
    }

    public Optional<User> findByEmail(String email) {
        var results = jdbcTemplate.query(SQL_FIND_BY_EMAIL, USER_ROW_MAPPER, email);
        return results.stream().findFirst();
    }

    public Optional<User> findById(UUID id) {
        var results = jdbcTemplate.query(SQL_FIND_BY_ID, USER_ROW_MAPPER, id);
        return results.stream().findFirst();
    }

    public User insert(User user) {
        jdbcTemplate.update(
                SQL_INSERT,
                user.getId(),
                user.getEmail(),
                user.getPassword(),
                user.getName()
        );
        return user;
    }
}
