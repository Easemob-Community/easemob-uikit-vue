<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 360px;
      margin: 0 auto;
    "
  >
    <em-user-card
      user-id="user_002"
      name="李四"
      status="online"
    />
    <em-user-card
      user-id="user_003"
      name="王五"
      status="busy"
    />
    <em-user-card
      user-id="user_004"
      name="赵六"
      status="custom"
    />
  </div>
</template>
