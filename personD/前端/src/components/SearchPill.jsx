import { useState } from "react";
import { Button, Input } from "antd";
import searchIcon from "../assets/icons/search.svg";

export default function SearchPill({ className = "", withButton = true, onSearch }) {
  const [value, setValue] = useState("");

  const submit = () => {
    onSearch?.(value.trim());
  };

  return (
    <div className={`search-pill ${className}`}>
      <img className="search-icon" src={searchIcon} alt="" />
      <Input
        variant="borderless"
        placeholder="请输入关键词"
        aria-label="请输入关键词"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onPressEnter={submit}
      />
      {withButton && (
        <Button type="primary" className="search-submit" onClick={submit}>
          搜索
        </Button>
      )}
    </div>
  );
}
