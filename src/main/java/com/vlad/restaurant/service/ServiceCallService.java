package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.ServiceCallEventMessage;
import com.vlad.restaurant.dto.ServiceCallRequest;
import com.vlad.restaurant.dto.ServiceCallResponse;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.entity.ServiceCall;
import com.vlad.restaurant.entity.ServiceCallStatus;
import com.vlad.restaurant.event.ServiceCallEvent;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import com.vlad.restaurant.repository.ServiceCallRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ServiceCallService {

    private final ServiceCallRepository callRepository;
    private final RestaurantTableRepository tableRepository;
    private final ApplicationEventPublisher eventPublisher;

    // Ідемпотентно: якщо за столом уже є відкритий виклик такого типу, повертаємо його,
    // а не створюємо дубль (гість нервово тисне кнопку - офіціанту прийде одне сповіщення).
    @Transactional
    public ServiceCallResponse create(UUID tableId, ServiceCallRequest request) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Стіл не знайдено"));

        var existing = callRepository.findFirstByTableIdAndTypeAndStatus(
                tableId, request.type(), ServiceCallStatus.OPEN);
        if (existing.isPresent()) {
            return ServiceCallResponse.from(existing.get());
        }

        ServiceCall call = new ServiceCall();
        call.setTable(table);
        call.setType(request.type());
        ServiceCallResponse response = ServiceCallResponse.from(callRepository.save(call));
        eventPublisher.publishEvent(new ServiceCallEvent(tableId,
                new ServiceCallEventMessage(ServiceCallEventMessage.Type.CALL_CREATED, response)));
        return response;
    }

    @Transactional(readOnly = true)
    public List<ServiceCallResponse> getOpen() {
        return callRepository.findAllByStatusOrderByCreatedAtAsc(ServiceCallStatus.OPEN)
                .stream().map(ServiceCallResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceCallResponse> getOpenForTable(UUID tableId) {
        return callRepository.findAllByTableIdAndStatusOrderByCreatedAtAsc(tableId, ServiceCallStatus.OPEN)
                .stream().map(ServiceCallResponse::from).toList();
    }

    // Офіціант позначає виклик обробленим. Повторне закриття - ідемпотентне.
    @Transactional
    public ServiceCallResponse resolve(UUID id) {
        ServiceCall call = callRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Виклик не знайдено"));
        if (call.getStatus() == ServiceCallStatus.RESOLVED) {
            return ServiceCallResponse.from(call);
        }
        call.setStatus(ServiceCallStatus.RESOLVED);
        call.setResolvedAt(LocalDateTime.now());
        ServiceCallResponse response = ServiceCallResponse.from(call);
        eventPublisher.publishEvent(new ServiceCallEvent(call.getTable().getId(),
                new ServiceCallEventMessage(ServiceCallEventMessage.Type.CALL_RESOLVED, response)));
        return response;
    }

    @Transactional
    public void cancelMyCalls(UUID tableId) {
        List<ServiceCall> open = callRepository.findAllByTableIdAndStatusOrderByCreatedAtAsc(tableId, ServiceCallStatus.OPEN);
        for (ServiceCall call : open) {
            call.setStatus(ServiceCallStatus.RESOLVED);
            call.setResolvedAt(LocalDateTime.now());
            ServiceCallResponse response = ServiceCallResponse.from(call);
            eventPublisher.publishEvent(new ServiceCallEvent(tableId,
                    new ServiceCallEventMessage(ServiceCallEventMessage.Type.CALL_RESOLVED, response)));
        }
    }
}
