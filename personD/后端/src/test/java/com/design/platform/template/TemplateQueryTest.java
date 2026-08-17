package com.design.platform.template;

import com.design.platform.template.dto.TemplateQuery;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TemplateQueryTest {

    @Test
    void pageAndSizeUseDefaults() {
        TemplateQuery query = new TemplateQuery();
        assertEquals(1, query.getPage());
        assertEquals(12, query.getSize());
    }

    @Test
    void sizeAbove50IsClampedTo50() {
        TemplateQuery query = new TemplateQuery();
        query.setSize(51);
        assertEquals(50, query.getSize());
    }

    @Test
    void pageBelowOneBecomesOne() {
        TemplateQuery query = new TemplateQuery();
        query.setPage(0);
        assertEquals(1, query.getPage());
    }
}
