package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPostIdOrderByCreatedAtAsc(Long postId);
    int countByPostId(Long postId);
    void deleteByPostId(Long postId);
}
