package auth_service.user;

import auth_service.dto.RegistrationRequest;
import auth_service.exception.EmailAlreadyExistsException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserDao userDao;
    private final PasswordEncoder passwordEncoder;

    public User createUser(RegistrationRequest request) {
        checkIfUserExists(request.email());
        return saveNewUser(request);
    }

    public Optional<User> findById(UUID id) {
        return userDao.findById(id);
    }

    private void checkIfUserExists(String email) {
        if (userDao.existsByEmail(email)) {
            throw new EmailAlreadyExistsException();
        }
    }

    private User saveNewUser(RegistrationRequest request) {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .build();

        return userDao.insert(user);
    }
}
