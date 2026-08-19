import { useState } from "react";
import { Button, Input } from "antd";
import searchIcon from "../assets/icons/search.svg";

export default function SearchPill({
  className = "",
  withButton = true,
  onSearch,
  placeholder = "请输入关键词",
  suffix = null,
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    onSearch?.(value.trim());
  };

  return (
    <div className={`search-pill ${className}`}>
      <img className="search-icon" src={searchIcon} alt="" />
      <Input
        variant="borderless"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onPressEnter={submit}
      />
      {suffix}
      {withButton && (
        <Button type="primary" className="search-submit" onClick={submit}>
          搜索
        </Button>
      )}
    </div>
  );
}
