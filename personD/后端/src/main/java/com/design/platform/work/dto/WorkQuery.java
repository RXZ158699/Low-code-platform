package com.design.platform.work.dto;

public class WorkQuery {

    private String status;
    private int page = 1;
    private int size = 12;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getPage() {
        return page < 1 ? 1 : page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        if (size < 1) {
            return 12;
        }
        return size > 50 ? 50 : size;
    }

    public void setSize(int size) {
        this.size = size;
    }
}
