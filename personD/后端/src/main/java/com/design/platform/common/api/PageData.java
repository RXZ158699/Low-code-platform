package com.design.platform.common.api;

import java.util.List;

public class PageData<T> {

    private long total;
    private long page;
    private long size;
    private List<T> records;

    public PageData() {
    }

    public PageData(long total, long page, long size, List<T> records) {
        this.total = total;
        this.page = page;
        this.size = size;
        this.records = records;
    }

    public static <T> PageData<T> of(long total, long page, long size, List<T> records) {
        return new PageData<>(total, page, size, records);
    }

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }

    public long getPage() {
        return page;
    }

    public void setPage(long page) {
        this.page = page;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }

    public List<T> getRecords() {
        return records;
    }

    public void setRecords(List<T> records) {
        this.records = records;
    }
}
