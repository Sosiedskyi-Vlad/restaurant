package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.RestaurantInfoRequest;
import com.vlad.restaurant.dto.RestaurantInfoResponse;
import com.vlad.restaurant.entity.RestaurantInfo;
import com.vlad.restaurant.repository.RestaurantInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RestaurantInfoService {

    private final RestaurantInfoRepository repository;

    @Transactional(readOnly = true)
    @Cacheable("restaurantInfo")
    public RestaurantInfoResponse getInfo() {
        RestaurantInfo info = repository.findById(1L).orElseGet(() -> {
            RestaurantInfo def = new RestaurantInfo();
            def.setId(1L);
            def.setName("Ресторан «RestoFlow»");
            def.setDescription("Авторська кухня, затишна атмосфера та швидкий сервіс");
            def.setWifiSsid("Resto_Guest");
            def.setWifiPassword("resto2026");
            def.setWorkingHours("Пн–Нд: 10:00 – 22:00");
            def.setAddress("вул. Володимирська, 24");
            def.setPhone("+380442345678");
            def.setAllergensNote("Якщо у вас є харчова алергія або особливі побажання до інгредієнтів, будь ласка, повідомте про це офіціанта.");
            def.setLatitude(50.4485);
            def.setLongitude(30.5186);
            RestaurantInfo saved = repository.save(def);
            repository.flush();
            return saved;
        });
        return RestaurantInfoResponse.from(info);
    }

    @Transactional
    @CacheEvict(value = "restaurantInfo", allEntries = true)
    public RestaurantInfoResponse updateInfo(RestaurantInfoRequest request) {
        RestaurantInfo info = repository.findById(1L).orElseGet(() -> {
            RestaurantInfo def = new RestaurantInfo();
            def.setId(1L);
            return def;
        });

        info.setName(request.name().trim());
        info.setDescription(request.description() != null ? request.description().trim() : null);
        info.setWifiSsid(request.wifiSsid() != null ? request.wifiSsid().trim() : null);
        info.setWifiPassword(request.wifiPassword() != null ? request.wifiPassword().trim() : null);
        info.setWorkingHours(request.workingHours() != null ? request.workingHours().trim() : null);
        info.setAddress(request.address() != null ? request.address().trim() : null);
        info.setPhone(request.phone() != null ? request.phone().trim() : null);
        info.setAllergensNote(request.allergensNote() != null ? request.allergensNote().trim() : null);
        info.setLatitude(request.latitude() != null ? request.latitude() : 50.4485);
        info.setLongitude(request.longitude() != null ? request.longitude() : 30.5186);

        RestaurantInfo saved = repository.save(info);
        repository.flush();
        return RestaurantInfoResponse.from(saved);
    }
}
